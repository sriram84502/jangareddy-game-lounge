import fs from "node:fs";
import path from "node:path";

// Node ESM compatibility shim for Emscripten sql.js
if (typeof (globalThis as any).__dirname === "undefined") {
  (globalThis as any).__dirname = process.cwd();
}
if (typeof (globalThis as any).__filename === "undefined") {
  (globalThis as any).__filename = path.join(process.cwd(), "index.js");
}

import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";

import { GAMES_LIST } from "@/data/games";
import { GROUP_SIZES, SESSION_DURATIONS, calculateSessionPrice } from "@/lib/pricing";
import { SQL_WASM_BASE64 } from "@/lib/sql-wasm-data.server";

let _db: SqlJsDatabase | null = null;
let _dbMtime = 0;
const DB_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production"
    ? path.resolve(process.env.TMPDIR || "/tmp", "friendz_data")
    : path.resolve(process.cwd(), "data");
const DB_PATH = path.resolve(DB_DIR, "friendz_arena.sqlite");

// PS5 Station Rig Definitions (Single Source of Truth)
export const PS5_STATIONS = [
  "Rig 01 · DualSense 1v1 Arena",
  "Rig 02 · Vice City Ready",
  "Rig 03 · Fighting Colosseum",
  "Rig 04 · PlayStation Exclusives",
  "Rig 05 · Co-op Squad Lounge",
] as const;

export type PS5StationName = (typeof PS5_STATIONS)[number];

// Helper to normalize and match rig identifiers across UI, bookings and station orders
export function matchRigName(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();
  if (normA === normB) return true;

  const getRigNum = (str: string) => {
    const m = str.match(/rig\s*0?([1-5])/i);
    return m ? Number(m[1]) : null;
  };

  const numA = getRigNum(normA);
  const numB = getRigNum(normB);
  if (numA !== null && numB !== null && numA === numB) return true;
  return normA.includes(normB) || normB.includes(normA);
}

/**
 * Returns current date formatted as YYYY-MM-DD in Indian Standard Time (Asia/Kolkata).
 * Guarantees that late night / early morning bookings match Indian calendar date.
 */
export function getIndianDateToday(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    // Fallback: UTC + 5.5 hours
    const istMs = d.getTime() + (5.5 * 60 + d.getTimezoneOffset()) * 60000;
    return new Date(istMs).toISOString().slice(0, 10);
  }
}

/**
 * Returns current minutes of the day in Indian Standard Time (0 to 1439).
 */
export function getIndianTimeNowMinutes(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

// Ensure data folder exists safely across serverless & local environments
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[SQL Database] Notice: running with ephemeral in-memory database storage.");
}

export function saveDatabaseToFile(db: SqlJsDatabase): void {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    if (fs.existsSync(DB_PATH)) {
      _dbMtime = fs.statSync(DB_PATH).mtimeMs;
    }
  } catch (err) {
    console.error("[SQL Database] Error saving to file:", err);
  }
}

export async function getSqlDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs({
    wasmBinary: Buffer.from(SQL_WASM_BASE64, "base64"),
  });

  if (fs.existsSync(DB_PATH)) {
    const stat = fs.statSync(DB_PATH);
    if (!_db || stat.mtimeMs > _dbMtime) {
      try {
        const fileBuffer = fs.readFileSync(DB_PATH);
        _db = new SQL.Database(fileBuffer);
        _dbMtime = stat.mtimeMs;
      } catch {
        if (!_db) _db = new SQL.Database();
      }
    }
  } else if (!_db) {
    _db = new SQL.Database();
  }

  // Initialize Core SQL Schemas
  _db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      contact_method TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      visit_time TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      duration_hours INTEGER NOT NULL,
      game_genre TEXT NOT NULL,
      notes TEXT NOT NULL,
      estimated_total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      station_rig TEXT,
      source TEXT NOT NULL DEFAULT 'online',
      snacks_ordered TEXT DEFAULT '',
      session_started_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS managed_games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      genre_label TEXT NOT NULL,
      players TEXT NOT NULL,
      tagline TEXT NOT NULL,
      badge TEXT,
      cover TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'ps-plus',
      copies_count INTEGER NOT NULL DEFAULT 5,
      is_new_arrival INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pricing_config (
      party_size INTEGER NOT NULL,
      duration_hours INTEGER NOT NULL,
      price INTEGER NOT NULL,
      PRIMARY KEY (party_size, duration_hours)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snacks_menu (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      is_combo INTEGER NOT NULL DEFAULT 0,
      combo_description TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      game_title TEXT NOT NULL,
      tournament_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      entry_fee INTEGER NOT NULL,
      prize_pool INTEGER NOT NULL,
      max_teams INTEGER NOT NULL DEFAULT 16,
      status TEXT NOT NULL DEFAULT 'open',
      rules TEXT,
      winner_gamertag TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournament_registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      gamer_tag TEXT NOT NULL,
      phone TEXT NOT NULL,
      team_name TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      registered_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gamer_passes (
      id TEXT PRIMARY KEY,
      pass_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      gamer_tag TEXT NOT NULL,
      total_hours INTEGER NOT NULL,
      remaining_hours INTEGER NOT NULL,
      price_paid INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS station_orders (
      id TEXT PRIMARY KEY,
      station_rig TEXT NOT NULL,
      service_type TEXT NOT NULL DEFAULT 'snacks',
      items_json TEXT NOT NULL DEFAULT '[]',
      total_amount INTEGER NOT NULL DEFAULT 0,
      customer_name TEXT DEFAULT 'Gamer',
      notes TEXT DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      role TEXT DEFAULT 'Gamer',
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT NOT NULL,
      favorite_game TEXT DEFAULT '',
      station_rig TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'approved',
      is_featured INTEGER NOT NULL DEFAULT 0,
      bg_color TEXT DEFAULT 'bg-gradient-to-b from-[#23C8F3] to-[#0284C7] text-black',
      card_angle TEXT DEFAULT 'rotate-[-1.5deg]',
      created_at TEXT NOT NULL
    );
  `);

  // Migrate any missing columns in existing SQLite tables safely
  try {
    _db.run("ALTER TABLE bookings ADD COLUMN snacks_ordered TEXT DEFAULT ''");
  } catch {}
  try {
    _db.run("ALTER TABLE bookings ADD COLUMN session_started_at TEXT");
  } catch {}
  try {
    _db.run("ALTER TABLE managed_games ADD COLUMN copies_count INTEGER NOT NULL DEFAULT 5");
  } catch {}

  // Seed Admin Credentials if empty
  const adminCheck = _db.exec("SELECT COUNT(*) as count FROM admin_users");
  const adminCount = adminCheck[0]?.values[0]?.[0] as number;
  if (!adminCount) {
    _db.run(
      "INSERT INTO admin_users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
      ["admin-1", "admin", "Arena@2026#PS5", "admin", new Date().toISOString()]
    );
  }

  // Seed Pricing Config if empty
  const pricingCheck = _db.exec("SELECT COUNT(*) as count FROM pricing_config");
  const pricingCount = pricingCheck[0]?.values[0]?.[0] as number;
  if (!pricingCount) {
    for (const size of GROUP_SIZES) {
      for (const dur of SESSION_DURATIONS) {
        const cost = calculateSessionPrice(size, dur);
        _db.run(
          "INSERT OR REPLACE INTO pricing_config (party_size, duration_hours, price) VALUES (?, ?, ?)",
          [size, dur, cost]
        );
      }
    }
  }

  // Seed Games if empty
  const gamesCheck = _db.exec("SELECT COUNT(*) as count FROM managed_games");
  const gamesCount = gamesCheck[0]?.values[0]?.[0] as number;
  if (!gamesCount) {
    // Specifically set GTA 6 to 2 physical discs as specified!
    for (const game of GAMES_LIST.slice(0, 30)) {
      const isGta = game.id.includes("gta") || game.title.toLowerCase().includes("grand theft auto");
      const copies = isGta ? 2 : 5; // 2 discs for GTA VI, 5 digital deluxe copies across all 5 rigs
      _db.run(
        `INSERT OR REPLACE INTO managed_games 
        (id, title, genre, genre_label, players, tagline, badge, cover, source, copies_count, is_new_arrival, is_featured, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          game.id,
          game.title,
          game.genre,
          game.genreLabel,
          game.players,
          game.tagline,
          game.badge || "",
          game.cover,
          isGta ? "disc" : game.source,
          copies,
          game.badge?.includes("Day 1") ? 1 : 0,
          game.featured ? 1 : 0,
          new Date().toISOString(),
        ]
      );
    }
  }

  // Ensure GTA 6 in managed_games explicitly has copies_count = 2 and source = 'disc'
  try {
    _db.run("UPDATE managed_games SET copies_count = 2, source = 'disc' WHERE id = 'grand-theft-auto-vi' OR title LIKE '%Grand Theft Auto VI%'");
  } catch {}

  // Seed Snacks & Combos Menu if empty
  const snacksCheck = _db.exec("SELECT COUNT(*) as count FROM snacks_menu");
  const snacksCount = snacksCheck[0]?.values[0]?.[0] as number;
  if (!snacksCount) {
    const defaultSnacks = [
      { id: "snack-1", name: "Red Bull Energy Drink (250ml)", category: "Beverage", price: 120, is_combo: 0, desc: "Ice-cold can for peak reflex gaming" },
      { id: "snack-2", name: "Monster Energy Green (350ml)", category: "Beverage", price: 120, is_combo: 0, desc: "High octane citrus boost" },
      { id: "snack-3", name: "Peri Peri Crispy French Fries", category: "Snacks", price: 80, is_combo: 0, desc: "Hot, spiced crinkle-cut fries" },
      { id: "snack-4", name: "Loaded Cheese Nachos & Dip", category: "Snacks", price: 90, is_combo: 0, desc: "Tortilla chips with jalapeño cheese sauce" },
      { id: "snack-5", name: "Double Masala Gaming Maggi", category: "Snacks", price: 60, is_combo: 0, desc: "Steaming spicy gamer fuel" },
      { id: "snack-6", name: "Chilled Mocha Cold Coffee", category: "Beverage", price: 70, is_combo: 0, desc: "Smooth caffeine refreshment" },
      { id: "combo-1", name: "Duo Battle Pack", category: "Combos", price: 299, is_combo: 1, desc: "2 Red Bulls + Peri Peri Fries (Save ₹50)" },
      { id: "combo-2", name: "Squad Feast Platter", category: "Combos", price: 499, is_combo: 1, desc: "4 Chilled Drinks + Nachos & Loaded Fries Platter (Save ₹100)" },
      { id: "combo-3", name: "Solo Night Fuel", category: "Combos", price: 160, is_combo: 1, desc: "1 Monster Energy + Double Masala Maggi (Save ₹20)" },
    ];
    for (const s of defaultSnacks) {
      _db.run(
        "INSERT INTO snacks_menu (id, name, category, price, is_combo, combo_description, is_available, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
        [s.id, s.name, s.category, s.price, s.is_combo, s.desc, new Date().toISOString()]
      );
    }
  }

  // Seed Gamer Passes if empty
  const passCheck = _db.exec("SELECT COUNT(*) as count FROM gamer_passes");
  const passCount = passCheck[0]?.values[0]?.[0] as number;
  if (!passCount) {
    _db.run(
      "INSERT INTO gamer_passes (id, pass_code, customer_name, phone, gamer_tag, total_hours, remaining_hours, price_paid, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ["pass-1", "ARENA-PRO-889", "Sai Teja", "9848011223", "ViperStriker", 10, 8, 800, "active", new Date().toISOString()]
    );
    _db.run(
      "INSERT INTO gamer_passes (id, pass_code, customer_name, phone, gamer_tag, total_hours, remaining_hours, price_paid, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ["pass-2", "ARENA-PASS-104", "Kiran Varma", "9949055667", "GhostKratos", 5, 4, 450, "active", new Date().toISOString()]
    );
  }

  // Seed Sample Bookings if empty
  const bookingsCheck = _db.exec("SELECT COUNT(*) as count FROM bookings");
  const bookingsCount = bookingsCheck[0]?.values[0]?.[0] as number;
  if (!bookingsCount) {
    const today = new Date().toISOString().slice(0, 10);
    _db.run(
      `INSERT INTO bookings 
      (id, customer_name, phone, contact_method, visit_date, visit_time, party_size, duration_hours, game_genre, notes, estimated_total, status, station_rig, source, snacks_ordered, session_started_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "booking-seed-1",
        "Karthik Varma",
        "8498833389",
        "whatsapp",
        today,
        "15:00",
        4,
        2,
        "sports",
        "EA SPORTS FC 24 with 4 friends · Rig 01",
        450,
        "confirmed",
        "Rig 01 · DualSense 1v1 Arena",
        "whatsapp",
        "2x Red Bull, 1x Peri Peri Fries",
        new Date().toISOString(),
        new Date(Date.now() - 3600000 * 3).toISOString(),
      ]
    );

    _db.run(
      `INSERT INTO bookings 
      (id, customer_name, phone, contact_method, visit_date, visit_time, party_size, duration_hours, game_genre, notes, estimated_total, status, station_rig, source, snacks_ordered, session_started_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "booking-seed-2",
        "Rahul Maddipati",
        "9848012345",
        "phone",
        today,
        "17:30",
        2,
        1,
        "open-world",
        "Grand Theft Auto VI (Disc 1 of 2)",
        150,
        "confirmed",
        "Rig 02 · Vice City Ready",
        "online",
        "",
        null,
        new Date(Date.now() - 3600000 * 2).toISOString(),
      ]
    );
  }

  // Seed Default Testimonials if empty
  const testimonialsCheck = _db.exec("SELECT COUNT(*) as count FROM testimonials");
  const testimonialsCount = testimonialsCheck[0]?.values[0]?.[0] as number;
  if (!testimonialsCount) {
    const defaultTestimonials = [
      {
        id: "testimonial-1",
        customer_name: "Ailani Wyatt",
        role: "FIFA & Cricket Regular",
        rating: 5,
        comment: "This gaming lounge exceeded all my expectations! The graphics on the 4K screens are breathtaking, and gameplay is ultra smooth. Cricket 24 with 4 friends was non-stop fun!",
        favorite_game: "Cricket 24",
        station_rig: "Rig 01 · DualSense 1v1 Arena",
        bg_color: "bg-gradient-to-b from-[#23C8F3] to-[#0284C7] text-black",
        card_angle: "rotate-[-2deg]",
        is_featured: 1,
      },
      {
        id: "testimonial-2",
        customer_name: "Keira Roy",
        role: "Tourney Player",
        rating: 5,
        comment: "The local multiplayer mode is a lot of fun. Controllers are perfectly balanced and genuinely responsive. Can't wait for GTA 6 launch day on these PS5 stations!",
        favorite_game: "Grand Theft Auto VI",
        station_rig: "Rig 02 · Vice City Ready",
        bg_color: "bg-gradient-to-b from-[#A855F7] to-[#7E22CE] text-white",
        card_angle: "rotate-[1.5deg]",
        is_featured: 1,
      },
      {
        id: "testimonial-3",
        customer_name: "Sam Lopez",
        role: "Regular Visitor",
        rating: 5,
        comment: "Plus, the regular game updates with new titles make it even better. Highly recommended for anyone looking for an exciting and immersive gaming experience in Jangareddygudem!",
        favorite_game: "EA SPORTS FC 24",
        station_rig: "Rig 03 · Fighting Colosseum",
        bg_color: "bg-gradient-to-b from-[#059669] to-[#047857] text-white",
        card_angle: "rotate-[-1.5deg]",
        is_featured: 0,
      },
      {
        id: "testimonial-4",
        customer_name: "Gianna McGee",
        role: "Weekend Squad",
        rating: 5,
        comment: "Absolutely love this gaming spot! The gameplay on PS5 is incredibly smooth, and group pricing is super reasonable (₹150 for 2 players). The vibe kept us hooked for 3 hours straight!",
        favorite_game: "TEKKEN 8",
        station_rig: "Rig 05 · Co-op Squad Lounge",
        bg_color: "bg-gradient-to-b from-[#84CC16] to-[#4D7C0F] text-black",
        card_angle: "rotate-[2deg]",
        is_featured: 0,
      },
    ];
    for (const t of defaultTestimonials) {
      _db.run(
        `INSERT INTO testimonials 
        (id, customer_name, role, rating, comment, favorite_game, station_rig, status, is_featured, bg_color, card_angle, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)`,
        [t.id, t.customer_name, t.role, t.rating, t.comment, t.favorite_game, t.station_rig, t.is_featured, t.bg_color, t.card_angle, new Date().toISOString()]
      );
    }
  }

  saveDatabaseToFile(_db);
  return _db;
}

// ==========================================
// SQL BOOKINGS & LIVE SESSIONS
// ==========================================
export interface SqlBookingRow {
  id: string;
  customer_name: string;
  phone: string;
  contact_method: string;
  visit_date: string;
  visit_time: string;
  party_size: number;
  duration_hours: number;
  game_genre: string;
  notes: string;
  estimated_total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  station_rig: string | null;
  source: string;
  snacks_ordered?: string;
  session_started_at?: string | null;
  created_at: string;
}

export async function sqlGetAllBookings(): Promise<SqlBookingRow[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM bookings ORDER BY visit_date DESC, visit_time DESC, created_at DESC");
  if (!res[0]) return [];

  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as SqlBookingRow;
  });
}

export const sqlGetBookings = sqlGetAllBookings;

export async function sqlInsertBooking(b: Omit<SqlBookingRow, "id" | "created_at">): Promise<SqlBookingRow> {
  const db = await getSqlDatabase();
  const id = `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created_at = new Date().toISOString();
  const today = getIndianDateToday();
  const isTodaySession = b.visit_date === today;

  // Crucial: Only sessions explicitly booked for today can ever have session_started_at set!
  // Future dates MUST ALWAYS have session_started_at as null so they never appear on TV or active meters!
  const sessionStartedAt = isTodaySession ? b.session_started_at || null : null;

  db.run(
    `INSERT INTO bookings 
    (id, customer_name, phone, contact_method, visit_date, visit_time, party_size, duration_hours, game_genre, notes, estimated_total, status, station_rig, source, snacks_ordered, session_started_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      b.customer_name,
      b.phone,
      b.contact_method,
      b.visit_date,
      b.visit_time,
      b.party_size,
      b.duration_hours,
      b.game_genre,
      b.notes,
      b.estimated_total,
      b.status,
      b.station_rig || null,
      b.source || "online",
      b.snacks_ordered || "",
      sessionStartedAt,
      created_at,
    ]
  );

  saveDatabaseToFile(db);

  return {
    ...b,
    id,
    session_started_at: sessionStartedAt,
    created_at,
  };
}

export async function sqlUpdateBookingStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
  station_rig?: string
): Promise<boolean> {
  const db = await getSqlDatabase();
  const today = getIndianDateToday();

  // Find the booking's scheduled visit_date
  const res = db.exec("SELECT visit_date FROM bookings WHERE id = ?", [id]);
  const visitDate = String(res[0]?.values[0]?.[0] || "");
  const isTodaySession = visitDate === today;

  if (station_rig && status === "confirmed") {
    if (isTodaySession) {
      // Confirming a booking reserves the rig without prematurely starting the session.
      // session_started_at is only set when the player is checked in or playing now.
      db.run("UPDATE bookings SET status = ?, station_rig = ? WHERE id = ?", [status, station_rig, id]);
    } else {
      // For future dates, keep session_started_at as NULL
      db.run("UPDATE bookings SET status = ?, station_rig = ?, session_started_at = NULL WHERE id = ?", [
        status,
        station_rig,
        id,
      ]);
    }
  } else if (station_rig) {
    db.run("UPDATE bookings SET status = ?, station_rig = ? WHERE id = ?", [status, station_rig, id]);
  } else if (status === "completed" || status === "cancelled") {
    db.run("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
  } else {
    db.run("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
  }
  saveDatabaseToFile(db);
  return true;
}

export async function sqlCheckInBooking(bookingId: string): Promise<boolean> {
  const db = await getSqlDatabase();
  const now = new Date().toISOString();
  db.run("UPDATE bookings SET status = 'confirmed', session_started_at = ? WHERE id = ?", [now, bookingId]);
  saveDatabaseToFile(db);
  return true;
}

export async function sqlExtendBooking(
  id: string,
  additionalHours: number,
  additionalCost: number
): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run(
    "UPDATE bookings SET duration_hours = duration_hours + ?, estimated_total = estimated_total + ? WHERE id = ?",
    [additionalHours, additionalCost, id]
  );
  saveDatabaseToFile(db);
  return true;
}

// =========================================================================
// RIG-SPECIFIC OCCUPANCY & CONFLICT DETECTION ENGINE
// RULE: If one rig is occupied from 4:00 to 5:00, NO other user can be added to it!
// =========================================================================

export interface RigConflictCheckResult {
  hasConflict: boolean;
  conflictingBooking?: SqlBookingRow | null;
  message?: string;
}

/**
 * Checks if a specific station rig has any time overlap on a given date.
 * Two time windows [S1, E1) and [S2, E2) conflict if S1 < E2 && S2 < E1.
 */
export async function sqlCheckRigConflict(
  visitDate: string,
  visitTime: string,
  durationHours: number,
  stationRig: string,
  excludeBookingId?: string
): Promise<RigConflictCheckResult> {
  const db = await getSqlDatabase();

  const [qh, qm] = visitTime.split(":").map(Number);
  const reqStart = (qh || 0) * 60 + (qm || 0);
  const reqEnd = reqStart + durationHours * 60;

  const res = db.exec(
    "SELECT * FROM bookings WHERE visit_date = ? AND status IN ('confirmed', 'pending') AND station_rig IS NOT NULL",
    [visitDate]
  );

  if (!res[0] || !res[0].values) {
    return { hasConflict: false };
  }

  const cols = res[0].columns;
  for (const row of res[0].values) {
    const booking: any = {};
    cols.forEach((col, i) => {
      booking[col] = row[i];
    });

    if (excludeBookingId && booking.id === excludeBookingId) continue;
    if (!matchRigName(booking.station_rig, stationRig)) continue;

    const [bh, bm] = String(booking.visit_time || "00:00").split(":").map(Number);
    const bStart = (bh || 0) * 60 + (bm || 0);
    const bEnd = bStart + (Number(booking.duration_hours) || 1) * 60;

    // Overlap condition: reqStart < bEnd && reqEnd > bStart
    if (reqStart < bEnd && reqEnd > bStart) {
      const startStr = `${String(Math.floor(bStart / 60)).padStart(2, "0")}:${String(bStart % 60).padStart(2, "0")}`;
      const endStr = `${String(Math.floor(bEnd / 60)).padStart(2, "0")}:${String(bEnd % 60).padStart(2, "0")}`;
      const rigShort = stationRig.split("·")[0]?.trim() || stationRig;
      return {
        hasConflict: true,
        conflictingBooking: booking as SqlBookingRow,
        message: `${rigShort} is already occupied from ${startStr} to ${endStr} by ${booking.customer_name}. You cannot assign another player to it at that time.`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Auto-assigns the next available free rig for a given slot.
 * Honors GTA VI 2-disc rule (Rig 01 and Rig 02 only for GTA VI).
 */
export async function sqlAutoAssignRig(
  visitDate: string,
  visitTime: string,
  durationHours: number,
  gameTitle?: string,
  excludeBookingId?: string
): Promise<{ assignedRig: string | null; allOccupied: boolean; message: string }> {
  const normGame = (gameTitle || "").toLowerCase();
  const isGta6 = normGame.includes("gta 6") || normGame.includes("gta vi") || normGame.includes("grand theft auto vi");

  let candidateRigs: string[] = [...PS5_STATIONS];
  if (isGta6) {
    // Only Rig 01 and Rig 02 hold the GTA VI physical discs
    candidateRigs = candidateRigs.filter((r) => r.startsWith("Rig 01") || r.startsWith("Rig 02"));
  }

  for (const rig of candidateRigs) {
    const conflict = await sqlCheckRigConflict(visitDate, visitTime, durationHours, rig, excludeBookingId);
    if (!conflict.hasConflict) {
      return {
        assignedRig: rig,
        allOccupied: false,
        message: `Auto-assigned to ${rig.split("·")[0]?.trim()}`,
      };
    }
  }

  return {
    assignedRig: null,
    allOccupied: true,
    message: isGta6
      ? "Both GTA VI stations (Rig 01 & Rig 02) are occupied during this time window. Choose another time or play a digital Deluxe title."
      : "All 5 PS5 stations are fully occupied during this time window.",
  };
}

/**
 * Returns occupancy breakdown for each of the 5 rigs for a requested slot.
 */
export async function sqlGetRigsAvailabilityForSlot(
  visitDate: string,
  visitTime: string,
  durationHours: number,
  excludeBookingId?: string
): Promise<
  Array<{
    rig: string;
    isOccupied: boolean;
    occupiedBy?: string;
    occupiedRange?: string;
  }>
> {
  const results = [];
  for (const rig of PS5_STATIONS) {
    const conflict = await sqlCheckRigConflict(visitDate, visitTime, durationHours, rig, excludeBookingId);
    if (conflict.hasConflict && conflict.conflictingBooking) {
      const b = conflict.conflictingBooking;
      const [bh, bm] = String(b.visit_time || "00:00").split(":").map(Number);
      const bStart = (bh || 0) * 60 + (bm || 0);
      const bEnd = bStart + (Number(b.duration_hours) || 1) * 60;
      const startStr = `${String(Math.floor(bStart / 60)).padStart(2, "0")}:${String(bStart % 60).padStart(2, "0")}`;
      const endStr = `${String(Math.floor(bEnd / 60)).padStart(2, "0")}:${String(bEnd % 60).padStart(2, "0")}`;
      results.push({
        rig,
        isOccupied: true,
        occupiedBy: b.customer_name,
        occupiedRange: `${startStr}–${endStr}`,
      });
    } else {
      results.push({
        rig,
        isOccupied: false,
      });
    }
  }
  return results;
}

// =========================================================================
// REAL-TIME SLOT & GAME AVAILABILITY ENGINE
// RULE: GTA 6 has only 2 physical discs
// RULE: All PlayStation Plus Deluxe digital games are available across all 5 rigs
// =========================================================================
export async function sqlCheckSlotAvailability(
  visitDate: string,
  visitTime: string,
  durationHours: number,
  gameTitle?: string
): Promise<{
  available: boolean;
  availableRigsCount: number;
  bookedRigsCount: number;
  gameAvailable: boolean;
  gameCopiesLeft: number;
  totalGameCopies: number;
  isGta6: boolean;
  isDeluxeDigital: boolean;
  message: string;
}> {
  const db = await getSqlDatabase();
  const TOTAL_STATIONS = 5;

  // Convert requested time to minutes
  const [qh, qm] = visitTime.split(":").map(Number);
  const reqStart = (qh || 0) * 60 + (qm || 0);
  const reqEnd = reqStart + durationHours * 60;

  const res = db.exec(
    "SELECT visit_time, duration_hours, status, notes FROM bookings WHERE visit_date = ? AND status != 'cancelled'",
    [visitDate]
  );

  let overlappingBookingsCount = 0;
  let overlappingGta6Count = 0;

  const normalizedGame = (gameTitle || "").toLowerCase().trim();
  const isGta6 =
    normalizedGame.includes("gta 6") ||
    normalizedGame.includes("gta vi") ||
    normalizedGame.includes("grand theft auto vi");

  // Rule: GTA 6 has ONLY 2 discs! Deluxe digital games available on all 5 rigs.
  const totalGameCopies = isGta6 ? 2 : 5;
  const isDeluxeDigital = !isGta6;

  if (res[0] && res[0].values) {
    for (const row of res[0].values) {
      const timeStr = String(row[0]);
      const dur = Number(row[1]) || 1;
      const notes = String(row[3] || "").toLowerCase();

      const [bh, bm] = timeStr.split(":").map(Number);
      const bStart = (bh || 0) * 60 + (bm || 0);
      const bEnd = bStart + dur * 60;

      // Overlap: reqStart < bEnd && reqEnd > bStart
      if (reqStart < bEnd && reqEnd > bStart) {
        overlappingBookingsCount++;

        // Track GTA 6 specific disc reservations
        if (
          notes.includes("gta 6") ||
          notes.includes("gta vi") ||
          notes.includes("grand theft auto vi")
        ) {
          overlappingGta6Count++;
        }
      }
    }
  }

  const freeRigsCount = Math.max(0, TOTAL_STATIONS - overlappingBookingsCount);
  const rigsAvailable = freeRigsCount > 0;

  // Determine game copy availability
  let gameCopiesLeft = totalGameCopies;
  let gameAvailable = true;

  if (isGta6) {
    gameCopiesLeft = Math.max(0, 2 - overlappingGta6Count);
    gameAvailable = gameCopiesLeft > 0 && rigsAvailable;
  } else {
    // Deluxe Edition / PS Plus Deluxe digital game available across all free rigs
    gameCopiesLeft = freeRigsCount;
    gameAvailable = rigsAvailable;
  }

  let message = "";
  if (!rigsAvailable) {
    message = `All 5 PS5 stations are fully booked for this time window. Please select an earlier or later slot.`;
  } else if (isGta6 && !gameAvailable) {
    message = `⚠️ Both 2 GTA VI physical discs are reserved for this slot! However, ${freeRigsCount} PS5 rigs are available for any of our 90+ PlayStation Plus Deluxe digital games.`;
  } else if (isGta6) {
    message = `🟢 Rig Free & GTA VI Disc Available (${gameCopiesLeft} of 2 physical discs free).`;
  } else {
    message = `🟢 ${freeRigsCount} of 5 PS5 stations free for this slot. (PlayStation Plus Deluxe edition installed across all 5 rigs).`;
  }

  return {
    available: rigsAvailable,
    availableRigsCount: freeRigsCount,
    bookedRigsCount: overlappingBookingsCount,
    gameAvailable,
    gameCopiesLeft,
    totalGameCopies,
    isGta6,
    isDeluxeDigital,
    message,
  };
}

// =========================================================================
// PLAYO-STYLE DAY SCHEDULE & MATRIX BREAKDOWN (FOR ADMIN & CUSTOMERS)
// =========================================================================

export interface RigSlotOccupancy {
  rig: string;
  isOccupied: boolean;
  bookingId?: string;
  customerName?: string;
  phone?: string;
  partySize?: number;
  durationHours?: number;
  gameGenre?: string;
  notes?: string;
  source?: string;
  status?: string;
  timeRange?: string;
}

export interface DaySlotSchedule {
  time: string; // "10:00"
  label: string; // "10:00 AM"
  totalRigs: number;
  occupiedCount: number;
  availableCount: number;
  onlineCount: number;
  storeCount: number;
  whatsappCount: number;
  isFull: boolean;
  isPast: boolean;
  rigs: RigSlotOccupancy[];
}

export interface DayScheduleResult {
  date: string;
  todayDate: string;
  isToday: boolean;
  metrics: {
    totalBookings: number;
    onlineBookings: number;
    storeBookings: number;
    whatsappBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    totalOccupiedRigHours: number;
    totalAvailableRigHours: number;
    capacityPercentage: number;
  };
  slots: DaySlotSchedule[];
  bookings: SqlBookingRow[];
}

/**
 * Returns comprehensive day schedule with slot-by-slot rig occupancy,
 * source breakdowns (online vs store vs whatsapp), and availability metrics.
 */
export async function sqlGetDaySchedule(visitDate: string): Promise<DayScheduleResult> {
  const db = await getSqlDatabase();
  const today = getIndianDateToday();
  const isToday = visitDate === today;
  const currentMinutes = getIndianTimeNowMinutes();

  const res = db.exec(
    "SELECT * FROM bookings WHERE visit_date = ? AND status != 'cancelled' ORDER BY visit_time ASC",
    [visitDate]
  );

  const bookings: SqlBookingRow[] = [];
  if (res[0] && res[0].values) {
    const cols = res[0].columns;
    for (const row of res[0].values) {
      const b: any = {};
      cols.forEach((col, i) => {
        b[col] = row[i];
      });
      bookings.push(b as SqlBookingRow);
    }
  }

  // Count metrics
  let onlineBookings = 0;
  let storeBookings = 0;
  let whatsappBookings = 0;
  let pendingBookings = 0;
  let confirmedBookings = 0;
  let completedBookings = 0;
  let totalOccupiedRigHours = 0;

  for (const b of bookings) {
    const src = (b.source || "online").toLowerCase();
    if (src === "online") onlineBookings++;
    else if (src === "whatsapp") whatsappBookings++;
    else storeBookings++;

    if (b.status === "pending") pendingBookings++;
    else if (b.status === "confirmed") confirmedBookings++;
    else if (b.status === "completed") completedBookings++;

    totalOccupiedRigHours += Number(b.duration_hours) || 1;
  }

  // Operational slots: 10:00 AM to 11:00 PM (13 hourly slots)
  const slotHours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const slots: DaySlotSchedule[] = [];

  for (const h of slotHours) {
    const slotTime = `${String(h).padStart(2, "0")}:00`;
    const slotLabel = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
    const slotStart = h * 60;
    const slotEnd = slotStart + 60;
    const isPast = isToday && slotEnd <= currentMinutes;

    const rigs: RigSlotOccupancy[] = [];
    let occupiedCount = 0;
    let onlineCount = 0;
    let storeCount = 0;
    let whatsappCount = 0;

    for (const rig of PS5_STATIONS) {
      // Find booking covering this rig during this slot
      const match = bookings.find((b) => {
        if (!b.station_rig || !matchRigName(b.station_rig, rig)) return false;
        const [bh, bm] = String(b.visit_time || "00:00").split(":").map(Number);
        const bStart = (bh || 0) * 60 + (bm || 0);
        const bEnd = bStart + (Number(b.duration_hours) || 1) * 60;
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (match) {
        occupiedCount++;
        const src = (match.source || "online").toLowerCase();
        if (src === "online") onlineCount++;
        else if (src === "whatsapp") whatsappCount++;
        else storeCount++;

        const [bh, bm] = String(match.visit_time || "00:00").split(":").map(Number);
        const bStart = (bh || 0) * 60 + (bm || 0);
        const bEnd = bStart + (Number(match.duration_hours) || 1) * 60;
        const startStr = `${String(Math.floor(bStart / 60)).padStart(2, "0")}:${String(bStart % 60).padStart(2, "0")}`;
        const endStr = `${String(Math.floor(bEnd / 60)).padStart(2, "0")}:${String(bEnd % 60).padStart(2, "0")}`;

        rigs.push({
          rig,
          isOccupied: true,
          bookingId: match.id,
          customerName: match.customer_name,
          phone: match.phone,
          partySize: match.party_size,
          durationHours: match.duration_hours,
          gameGenre: match.game_genre,
          notes: match.notes,
          source: match.source,
          status: match.status,
          timeRange: `${startStr}–${endStr}`,
        });
      } else {
        rigs.push({
          rig,
          isOccupied: false,
        });
      }
    }

    const availableCount = 5 - occupiedCount;

    slots.push({
      time: slotTime,
      label: slotLabel,
      totalRigs: 5,
      occupiedCount,
      availableCount,
      onlineCount,
      storeCount,
      whatsappCount,
      isFull: availableCount === 0,
      isPast,
      rigs,
    });
  }

  const totalPossibleRigHours = slotHours.length * 5; // 65 rig-hours
  const totalAvailableRigHours = Math.max(0, totalPossibleRigHours - totalOccupiedRigHours);
  const capacityPercentage = Math.round((totalOccupiedRigHours / totalPossibleRigHours) * 100);

  return {
    date: visitDate,
    todayDate: today,
    isToday,
    metrics: {
      totalBookings: bookings.length,
      onlineBookings,
      storeBookings,
      whatsappBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      totalOccupiedRigHours,
      totalAvailableRigHours,
      capacityPercentage,
    },
    slots,
    bookings,
  };
}

/**
 * Playo-style slot availability query for the customer booking interface.
 * Returns availability for every operational hour on the selected date.
 */
export async function sqlGetDaySlotsAvailability(
  visitDate: string,
  durationHours: number = 1,
  gameTitle?: string
) {
  const today = getIndianDateToday();
  const isToday = visitDate === today;
  const currentMinutes = getIndianTimeNowMinutes();

  const slotHours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const results = [];

  for (const h of slotHours) {
    const timeStr = `${String(h).padStart(2, "0")}:00`;
    const label = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
    const slotStart = h * 60;
    const isPast = isToday && slotStart <= currentMinutes;

    const check = await sqlCheckSlotAvailability(visitDate, timeStr, durationHours, gameTitle);

    results.push({
      time: timeStr,
      label,
      availableRigsCount: check.availableRigsCount,
      bookedRigsCount: check.bookedRigsCount,
      gameCopiesLeft: check.gameCopiesLeft,
      totalGameCopies: check.totalGameCopies,
      isGta6: check.isGta6,
      isAvailable: check.available && check.gameAvailable && !isPast,
      isFastFilling: check.available && check.availableRigsCount <= 2 && !isPast,
      isFull: !check.available || (check.isGta6 && !check.gameAvailable),
      isPast,
      message: isPast ? "Slot has passed" : check.message,
    });
  }

  return {
    date: visitDate,
    todayDate: today,
    isToday,
    slots: results,
  };
}

// ==========================================
// MANAGED GAMES (Full Admin CRUD)
// ==========================================
export async function sqlGetManagedGames(): Promise<any[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM managed_games ORDER BY is_new_arrival DESC, is_featured DESC, created_at DESC");
  if (!res[0]) return [];

  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function sqlAddManagedGame(game: {
  id: string;
  title: string;
  genre: string;
  genre_label: string;
  players: string;
  tagline: string;
  badge?: string;
  cover: string;
  source?: string;
  copies_count?: number;
  is_new_arrival: boolean;
  is_featured: boolean;
}): Promise<boolean> {
  const db = await getSqlDatabase();
  const copies = game.copies_count ?? (game.id.includes("gta") ? 2 : 5);
  db.run(
    `INSERT OR REPLACE INTO managed_games 
    (id, title, genre, genre_label, players, tagline, badge, cover, source, copies_count, is_new_arrival, is_featured, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      game.id,
      game.title,
      game.genre,
      game.genre_label,
      game.players,
      game.tagline,
      game.badge || "",
      game.cover,
      game.source || "ps-plus",
      copies,
      game.is_new_arrival ? 1 : 0,
      game.is_featured ? 1 : 0,
      new Date().toISOString(),
    ]
  );
  saveDatabaseToFile(db);
  return true;
}

export async function sqlUpdateManagedGame(game: {
  id: string;
  title: string;
  genre: string;
  genre_label: string;
  players: string;
  tagline: string;
  badge?: string;
  cover: string;
  source: string;
  copies_count: number;
  is_new_arrival: boolean;
  is_featured: boolean;
}): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run(
    `UPDATE managed_games 
     SET title = ?, genre = ?, genre_label = ?, players = ?, tagline = ?, badge = ?, cover = ?, source = ?, copies_count = ?, is_new_arrival = ?, is_featured = ?
     WHERE id = ?`,
    [
      game.title,
      game.genre,
      game.genre_label,
      game.players,
      game.tagline,
      game.badge || "",
      game.cover,
      game.source,
      game.copies_count,
      game.is_new_arrival ? 1 : 0,
      game.is_featured ? 1 : 0,
      game.id,
    ]
  );
  saveDatabaseToFile(db);
  return true;
}

export async function sqlDeleteManagedGame(id: string): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run("DELETE FROM managed_games WHERE id = ?", [id]);
  saveDatabaseToFile(db);
  return true;
}

// ==========================================
// PRICING CONFIG (Full Admin Modification)
// ==========================================
export async function sqlGetPricing(): Promise<{ party_size: number; duration_hours: number; price: number }[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM pricing_config ORDER BY party_size ASC, duration_hours ASC");
  if (!res[0]) return [];

  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function sqlUpdatePricing(partySize: number, durationHours: number, price: number): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run("INSERT OR REPLACE INTO pricing_config (party_size, duration_hours, price) VALUES (?, ?, ?)", [
    partySize,
    durationHours,
    price,
  ]);
  saveDatabaseToFile(db);
  return true;
}

// ==========================================
// SNACKS & COMBOS MENU (Full Admin CRUD)
// ==========================================
export async function sqlGetSnacks(): Promise<any[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM snacks_menu ORDER BY is_combo DESC, price ASC");
  if (!res[0]) return [];

  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * TV Live Status query: strictly loads confirmed sessions for TODAY in India.
 * Other dates and unconfirmed online requests are never passed to the TV board.
 */
export async function sqlGetLoungeTvStatus(): Promise<{
  today: string;
  todayBookings: SqlBookingRow[];
  combos: any[];
}> {
  const today = getIndianDateToday();
  const allBookings = await sqlGetAllBookings();
  const snacks = await sqlGetSnacks();

  const todayBookings = allBookings.filter(
    (b) => b.visit_date === today && b.status === "confirmed"
  );

  return {
    today,
    todayBookings,
    combos: snacks.filter((s) => s.is_combo && s.is_available),
  };
}

export async function sqlAddSnack(snack: {
  id?: string;
  name: string;
  category: string;
  price: number;
  is_combo: boolean;
  combo_description?: string;
}): Promise<boolean> {
  const db = await getSqlDatabase();
  const id = snack.id || `snack-${Date.now()}`;
  db.run(
    "INSERT INTO snacks_menu (id, name, category, price, is_combo, combo_description, is_available, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
    [
      id,
      snack.name,
      snack.category,
      snack.price,
      snack.is_combo ? 1 : 0,
      snack.combo_description || "",
      new Date().toISOString(),
    ]
  );
  saveDatabaseToFile(db);
  return true;
}

export async function sqlUpdateSnack(snack: {
  id: string;
  name: string;
  category: string;
  price: number;
  is_combo: boolean;
  combo_description?: string;
  is_available: boolean;
}): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run(
    "UPDATE snacks_menu SET name = ?, category = ?, price = ?, is_combo = ?, combo_description = ?, is_available = ? WHERE id = ?",
    [
      snack.name,
      snack.category,
      snack.price,
      snack.is_combo ? 1 : 0,
      snack.combo_description || "",
      snack.is_available ? 1 : 0,
      snack.id,
    ]
  );
  saveDatabaseToFile(db);
  return true;
}

export async function sqlDeleteSnack(id: string): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run("DELETE FROM snacks_menu WHERE id = ?", [id]);
  saveDatabaseToFile(db);
  return true;
}

// ==========================================
// GAMER PASSES & DIGITAL LOYALTY CARDS
// ==========================================
export async function sqlGetGamerPasses(): Promise<any[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM gamer_passes ORDER BY created_at DESC");
  if (!res[0]) return [];

  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function sqlIssueGamerPass(pass: {
  customer_name: string;
  phone: string;
  gamer_tag: string;
  total_hours: number;
  price_paid: number;
}): Promise<any> {
  const db = await getSqlDatabase();
  const id = `pass-${Date.now()}`;
  const pass_code = `ARENA-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  db.run(
    "INSERT INTO gamer_passes (id, pass_code, customer_name, phone, gamer_tag, total_hours, remaining_hours, price_paid, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)",
    [
      id,
      pass_code,
      pass.customer_name,
      pass.phone,
      pass.gamer_tag,
      pass.total_hours,
      pass.total_hours,
      pass.price_paid,
      new Date().toISOString(),
    ]
  );
  saveDatabaseToFile(db);
  return { id, pass_code, ...pass, remaining_hours: pass.total_hours, status: "active" };
}

export async function sqlDeductPassHours(passCode: string, hoursToDeduct: number): Promise<{ success: boolean; remaining: number; message: string }> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT id, remaining_hours, status FROM gamer_passes WHERE pass_code = ?", [passCode]);
  if (!res[0] || !res[0].values[0]) {
    return { success: false, remaining: 0, message: "Gamer Pass not found." };
  }

  const currentHours = Number(res[0].values[0][1]);
  if (currentHours < hoursToDeduct) {
    return { success: false, remaining: currentHours, message: `Insufficient pass balance (${currentHours} hrs left).` };
  }

  const remaining = currentHours - hoursToDeduct;
  const status = remaining === 0 ? "exhausted" : "active";
  db.run("UPDATE gamer_passes SET remaining_hours = ?, status = ? WHERE pass_code = ?", [remaining, status, passCode]);
  saveDatabaseToFile(db);

  return { success: true, remaining, message: `Deducted ${hoursToDeduct} hr(s). ${remaining} hrs remaining on pass.` };
}

export async function sqlTopUpGamerPass(
  passCode: string,
  hoursToAdd: number,
  additionalPrice: number
): Promise<{ success: boolean; remaining: number; total: number; message: string; pass?: any }> {
  const db = await getSqlDatabase();
  const res = db.exec(
    "SELECT id, remaining_hours, total_hours, price_paid, customer_name, gamer_tag, phone FROM gamer_passes WHERE pass_code = ?",
    [passCode]
  );
  if (!res[0] || !res[0].values[0]) {
    return { success: false, remaining: 0, total: 0, message: "Gamer Pass not found." };
  }

  const currentRemaining = Number(res[0].values[0][1]) || 0;
  const currentTotal = Number(res[0].values[0][2]) || 0;
  const currentPrice = Number(res[0].values[0][3]) || 0;
  const customerName = String(res[0].values[0][4]);
  const gamerTag = String(res[0].values[0][5]);
  const phone = String(res[0].values[0][6]);

  const newRemaining = currentRemaining + hoursToAdd;
  const newTotal = currentTotal + hoursToAdd;
  const newPrice = currentPrice + additionalPrice;

  db.run(
    "UPDATE gamer_passes SET remaining_hours = ?, total_hours = ?, price_paid = ?, status = 'active' WHERE pass_code = ?",
    [newRemaining, newTotal, newPrice, passCode]
  );
  saveDatabaseToFile(db);

  return {
    success: true,
    remaining: newRemaining,
    total: newTotal,
    message: `Successfully topped up +${hoursToAdd} hr(s)! New balance: ${newRemaining} hrs.`,
    pass: {
      pass_code: passCode,
      customer_name: customerName,
      gamer_tag: gamerTag,
      phone,
      remaining_hours: newRemaining,
      total_hours: newTotal,
      hours_added: hoursToAdd,
      amount_paid: additionalPrice,
    },
  };
}

export async function sqlDeleteGamerPass(id: string): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run("DELETE FROM gamer_passes WHERE id = ? OR pass_code = ?", [id, id]);
  saveDatabaseToFile(db);
  return true;
}

// ==========================================
// BUSINESS REVENUE & ANALYTICS
// ==========================================
export async function sqlGetAnalytics(): Promise<any> {
  const db = await getSqlDatabase();
  const today = new Date().toISOString().slice(0, 10);

  // Total Revenue
  const revRes = db.exec("SELECT SUM(estimated_total) FROM bookings WHERE status IN ('confirmed', 'completed')");
  const totalRevenue = (revRes[0]?.values[0]?.[0] as number) || 0;

  // Today Revenue
  const todayRevRes = db.exec(
    "SELECT SUM(estimated_total) FROM bookings WHERE visit_date = ? AND status IN ('confirmed', 'completed')",
    [today]
  );
  const todayRevenue = (todayRevRes[0]?.values[0]?.[0] as number) || 0;

  // Total Hours Played
  const hoursRes = db.exec("SELECT SUM(duration_hours) FROM bookings WHERE status IN ('confirmed', 'completed')");
  const totalHours = (hoursRes[0]?.values[0]?.[0] as number) || 0;

  // Total Bookings
  const countRes = db.exec("SELECT COUNT(*) FROM bookings");
  const totalBookings = (countRes[0]?.values[0]?.[0] as number) || 0;

  // Rig Utilization Breakdown
  const rigRes = db.exec(
    "SELECT station_rig, COUNT(*), SUM(estimated_total) FROM bookings WHERE station_rig IS NOT NULL AND status IN ('confirmed', 'completed') GROUP BY station_rig"
  );
  const rigStats = (rigRes[0]?.values || []).map((row) => ({
    rig: row[0],
    bookingsCount: row[1],
    totalRevenue: row[2],
  }));

  return {
    totalRevenue,
    todayRevenue,
    totalHours,
    totalBookings,
    rigStats,
  };
}

// ==========================================
// STATION RIG IN-GAME ORDERS & CALLS
// ==========================================
export async function sqlSubmitStationOrder(order: {
  station_rig: string;
  service_type: string;
  items_json: string;
  total_amount: number;
  customer_name?: string;
  notes?: string;
  payment_method: string;
}): Promise<any> {
  const db = await getSqlDatabase();
  const id = `order-${Date.now()}`;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO station_orders (id, station_rig, service_type, items_json, total_amount, customer_name, notes, payment_method, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      id,
      order.station_rig,
      order.service_type,
      order.items_json,
      order.total_amount,
      order.customer_name || "Gamer",
      order.notes || "",
      order.payment_method || "cash",
      now,
    ]
  );
  saveDatabaseToFile(db);
  return { id, ...order, status: "pending", created_at: now };
}

export async function sqlGetStationOrders(): Promise<any[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM station_orders ORDER BY created_at DESC LIMIT 50");
  if (!res[0]) return [];

  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function sqlUpdateStationOrderStatus(id: string, status: string): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run("UPDATE station_orders SET status = ? WHERE id = ?", [status, id]);
  saveDatabaseToFile(db);
  return true;
}

// ==========================================
// PUBLIC GAMER PASS QUERY
// ==========================================
export async function sqlGetGamerPassByQuery(query: string): Promise<any | null> {
  const db = await getSqlDatabase();
  const cleanQ = query.trim();
  if (!cleanQ) return null;

  const res = db.exec(
    "SELECT * FROM gamer_passes WHERE LOWER(pass_code) = LOWER(?) OR LOWER(gamer_tag) = LOWER(?) OR phone = ? LIMIT 1",
    [cleanQ, cleanQ, cleanQ]
  );
  if (!res[0] || !res[0].values[0]) return null;

  const cols = res[0].columns;
  const row = res[0].values[0];
  const obj: any = {};
  cols.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

// ==========================================
// TESTIMONIALS & REVIEWS ENGINE
// ==========================================
export interface SqlTestimonialRow {
  id: string;
  customer_name: string;
  role: string;
  rating: number;
  comment: string;
  favorite_game: string;
  station_rig: string;
  status: "approved" | "pending" | "hidden";
  is_featured: number;
  bg_color: string;
  card_angle: string;
  created_at: string;
}

export async function sqlGetPublicTestimonials(): Promise<SqlTestimonialRow[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM testimonials WHERE status = 'approved' ORDER BY is_featured DESC, created_at DESC");
  if (!res[0]) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as SqlTestimonialRow;
  });
}

export async function sqlGetAllTestimonialsAdmin(): Promise<SqlTestimonialRow[]> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM testimonials ORDER BY created_at DESC");
  if (!res[0]) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as SqlTestimonialRow;
  });
}

const TESTIMONIAL_COLORS = [
  "bg-gradient-to-b from-[#23C8F3] to-[#0284C7] text-black",
  "bg-gradient-to-b from-[#A855F7] to-[#7E22CE] text-white",
  "bg-gradient-to-b from-[#059669] to-[#047857] text-white",
  "bg-gradient-to-b from-[#84CC16] to-[#4D7C0F] text-black",
  "bg-gradient-to-b from-[#F59E0B] to-[#D97706] text-black",
  "bg-gradient-to-b from-[#F43F5E] to-[#BE123C] text-white",
];

const TESTIMONIAL_ANGLES = ["rotate-[-1.5deg]", "rotate-[1.5deg]", "rotate-[-2deg]", "rotate-[2deg]"];

export async function sqlAddTestimonial(input: {
  customer_name: string;
  role?: string;
  rating?: number;
  comment: string;
  favorite_game?: string;
  station_rig?: string;
  status?: "approved" | "pending" | "hidden";
}): Promise<SqlTestimonialRow> {
  const db = await getSqlDatabase();
  const id = `testimonial-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const created_at = new Date().toISOString();
  const rating = Math.max(1, Math.min(5, Number(input.rating) || 5));
  const role = input.role?.trim() || "Gamer";
  const status = input.status || "approved";

  // Pick balanced styling
  const bg_color = TESTIMONIAL_COLORS[Math.floor(Math.random() * TESTIMONIAL_COLORS.length)];
  const card_angle = TESTIMONIAL_ANGLES[Math.floor(Math.random() * TESTIMONIAL_ANGLES.length)];

  db.run(
    `INSERT INTO testimonials 
    (id, customer_name, role, rating, comment, favorite_game, station_rig, status, is_featured, bg_color, card_angle, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      input.customer_name.trim(),
      role,
      rating,
      input.comment.trim(),
      input.favorite_game?.trim() || "",
      input.station_rig?.trim() || "",
      status,
      bg_color,
      card_angle,
      created_at,
    ]
  );
  saveDatabaseToFile(db);

  return {
    id,
    customer_name: input.customer_name.trim(),
    role,
    rating,
    comment: input.comment.trim(),
    favorite_game: input.favorite_game?.trim() || "",
    station_rig: input.station_rig?.trim() || "",
    status,
    is_featured: 0,
    bg_color,
    card_angle,
    created_at,
  };
}

export async function sqlGetTestimonialById(id: string): Promise<SqlTestimonialRow | null> {
  const db = await getSqlDatabase();
  const res = db.exec("SELECT * FROM testimonials WHERE id = ?", [id]);
  if (!res[0] || !res[0].values || !res[0].values[0]) return null;
  const cols = res[0].columns;
  const obj: any = {};
  cols.forEach((col, i) => {
    obj[col] = res[0].values[0][i];
  });
  return obj as SqlTestimonialRow;
}

export async function sqlUpdateTestimonialStatus(id: string, status: "approved" | "pending" | "hidden"): Promise<SqlTestimonialRow | null> {
  const db = await getSqlDatabase();
  db.run("UPDATE testimonials SET status = ? WHERE id = ?", [status, id]);
  saveDatabaseToFile(db);
  return await sqlGetTestimonialById(id);
}

export async function sqlToggleTestimonialFeatured(id: string, is_featured: boolean | number): Promise<SqlTestimonialRow | null> {
  const db = await getSqlDatabase();
  db.run("UPDATE testimonials SET is_featured = ? WHERE id = ?", [is_featured ? 1 : 0, id]);
  saveDatabaseToFile(db);
  return await sqlGetTestimonialById(id);
}

export async function sqlDeleteTestimonial(id: string): Promise<boolean> {
  const db = await getSqlDatabase();
  db.run("DELETE FROM testimonials WHERE id = ?", [id]);
  saveDatabaseToFile(db);
  return true;
}
