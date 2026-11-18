import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { calculateSessionPrice } from "@/lib/pricing";

function normalizeTime(timeStr: unknown): string {
  if (!timeStr) return "16:00";
  let t = String(timeStr).trim();
  const isPM = /pm$/i.test(t);
  const isAM = /am$/i.test(t);
  t = t.replace(/(am|pm)$/i, "").trim();

  const parts = t.split(":");
  let h = parseInt(parts[0] || "16", 10);
  let m = parseInt(parts[1] || "0", 10);

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  if (isNaN(h) || h < 0 || h > 23) h = 16;
  if (isNaN(m) || m < 0 || m > 59) m = 0;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function normalizeDate(dateStr: unknown): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const d = String(dateStr).trim();
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(d)) {
    const parts = d.split(/[-/]/);
    return `${parts[2]}-${String(parts[1]).padStart(2, "0")}-${String(parts[0]).padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d;
  }
  return new Date().toISOString().slice(0, 10);
}

const bookingRequestSchema = z.object({
  customerName: z.preprocess((v) => String(v || "").trim() || "Guest", z.string().min(1).max(100)),
  phone: z.preprocess((v) => String(v || "").trim() || "8498833389", z.string().min(5).max(30)),
  contactMethod: z.preprocess((v) => (v === "phone" ? "phone" : "whatsapp"), z.enum(["phone", "whatsapp"])),
  visitDate: z.preprocess(normalizeDate, z.string()),
  visitTime: z.preprocess(normalizeTime, z.string()),
  partySize: z.preprocess((v) => Math.min(5, Math.max(1, Math.round(Number(v) || 1))), z.number().int().min(1).max(5)),
  durationHours: z.preprocess((v) => {
    const n = Math.round(Number(v) || 1);
    return [1, 2, 3].includes(n) ? n : 1;
  }, z.union([z.literal(1), z.literal(2), z.literal(3)])),
  gameGenre: z.preprocess((v) => String(v || "any"), z.string()),
  gameTitle: z.string().optional(),
  snacksOrdered: z.string().optional(),
  notes: z.preprocess((v) => String(v || ""), z.string().max(500)),
  website: z.preprocess((v) => String(v || ""), z.string().max(0)),
});

// 1. Public Booking Request Submission (Stored in SQL DB)
export const submitBookingRequest = createServerFn({ method: "POST" })
  .validator((input: unknown) => bookingRequestSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website.length > 0) return { success: true };

    const estimatedTotal = calculateSessionPrice(data.partySize, data.durationHours);
    const { sqlInsertBooking, sqlCheckSlotAvailability, sqlAutoAssignRig } = await import("@/lib/db.server");

    // Check slot & game availability before saving
    const availability = await sqlCheckSlotAvailability(
      data.visitDate,
      data.visitTime,
      data.durationHours,
      data.gameTitle || data.notes
    );

    if (!availability.available) {
      return {
        success: false,
        error: "All 5 PS5 stations are fully booked for this slot. Please select another time.",
      };
    }

    if (!availability.gameAvailable && availability.isGta6) {
      return {
        success: false,
        error: "Both 2 GTA VI physical discs are already reserved for this slot! Please choose another time or pick from 90+ PlayStation Plus Deluxe digital games.",
      };
    }

    // Auto-assign available station rig for this slot
    const autoResult = await sqlAutoAssignRig(
      data.visitDate,
      data.visitTime,
      data.durationHours,
      data.notes || data.gameGenre
    );
    const assignedRig = autoResult.assignedRig;

    // Save to SQL Database
    const newBooking = await sqlInsertBooking({
      customer_name: data.customerName,
      phone: data.phone,
      contact_method: data.contactMethod,
      visit_date: data.visitDate,
      visit_time: data.visitTime,
      party_size: data.partySize,
      duration_hours: data.durationHours,
      game_genre: data.gameGenre,
      notes: data.notes,
      estimated_total: estimatedTotal,
      status: "pending",
      station_rig: assignedRig || null,
      source: "online",
      snacks_ordered: data.snacksOrdered || "",
      session_started_at: null,
    });

    const msg = assignedRig
      ? `Booking request saved for ${data.visitDate} at ${data.visitTime}! Station ${assignedRig.split("·")[0]?.trim()} provisionally held.`
      : `Booking request saved for ${data.visitDate} at ${data.visitTime}!`;
    return {
      success: true,
      message: msg,
      assignedRig,
      booking: {
        id: newBooking.id,
        customerName: newBooking.customer_name,
        phone: newBooking.phone,
        contactMethod: newBooking.contact_method,
        visitDate: newBooking.visit_date,
        visitTime: newBooking.visit_time,
        partySize: newBooking.party_size,
        durationHours: newBooking.duration_hours,
        gameGenre: newBooking.game_genre,
        notes: newBooking.notes,
        estimatedTotal: newBooking.estimated_total,
        status: newBooking.status,
        stationRig: newBooking.station_rig,
        source: newBooking.source,
      },
    };
  });

// 2. Playo-Style All-Slots Availability Checking for a Given Date
export const getDaySlotsAvailabilityFn = createServerFn({ method: "GET" })
  .validator(
    (input: { visitDate: string; durationHours?: number; gameTitle?: string }) => {
      return z
        .object({
          visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          durationHours: z.preprocess((v) => Number(v) || 1, z.number().int().min(1).max(3)).default(1),
          gameTitle: z.string().optional(),
        })
        .parse(input);
    }
  )
  .handler(async ({ data }) => {
    const { sqlGetDaySlotsAvailability } = await import("@/lib/db.server");
    return await sqlGetDaySlotsAvailability(data.visitDate, data.durationHours, data.gameTitle);
  });

// 2. Automatic Slot Availability Checking (Backend Query in SQL with GTA 6 2-disc check)
export const checkSlotAvailabilityFn = createServerFn({ method: "GET" })
  .validator(
    (input: { visitDate: string; visitTime: string; durationHours: number; gameTitle?: string }) => {
      return z
        .object({
          visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          visitTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          durationHours: z.number().int().min(1).max(3),
          gameTitle: z.string().optional(),
        })
        .parse(input);
    }
  )
  .handler(async ({ data }) => {
    const { sqlCheckSlotAvailability } = await import("@/lib/db.server");
    return await sqlCheckSlotAvailability(
      data.visitDate,
      data.visitTime,
      data.durationHours,
      data.gameTitle
    );
  });

// 3. Admin Authentication Login
export const adminLoginFn = createServerFn({ method: "POST" })
  .validator((input: { username: string; password: string }) => {
    return z
      .object({
        username: z.string().trim(),
        password: z.string().trim(),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    const { getSqlDatabase } = await import("@/lib/db.server");
    const db = await getSqlDatabase();
    const res = db.exec(
      "SELECT id, username, role FROM admin_users WHERE username = ? AND password_hash = ?",
      [data.username, data.password]
    );

    if (!res[0] || res[0].values.length === 0) {
      return { success: false, error: "Invalid username or password" };
    }

    const token = `adm_token_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return {
      success: true,
      token,
      user: {
        id: String(res[0].values[0][0]),
        username: String(res[0].values[0][1]),
        role: String(res[0].values[0][2]),
      },
    };
  });

// 4. Admin: Fetch All Bookings (via SQL)
export const adminGetBookingsFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetAllBookings } = await import("@/lib/db.server");
    const bookings = await sqlGetAllBookings();
    return { success: true, bookings };
  });

// 5. Admin: Create Offline / Walk-in / WhatsApp Booking (via SQL with Conflict & Auto-Assign Checks)
export const adminCreateOfflineBookingFn = createServerFn({ method: "POST" })
  .validator((input: any) => {
    return z
      .object({
        token: z.string().min(1, "Authentication required"),
        customerName: z.preprocess((v) => String(v || "").trim() || "Walk-in Guest", z.string().min(1)),
        phone: z.preprocess((v) => String(v || "").trim() || "8498833389", z.string().min(5)),
        contactMethod: z.preprocess((v) => (v === "phone" ? "phone" : "whatsapp"), z.enum(["phone", "whatsapp"])),
        visitDate: z.preprocess(normalizeDate, z.string()),
        visitTime: z.preprocess(normalizeTime, z.string()),
        partySize: z.preprocess((v) => Math.min(5, Math.max(1, Math.round(Number(v) || 1))), z.number().int().min(1).max(5)),
        durationHours: z.preprocess((v) => {
          const n = Math.round(Number(v) || 1);
          return [1, 2, 3].includes(n) ? n : 1;
        }, z.union([z.literal(1), z.literal(2), z.literal(3)])),
        gameGenre: z.preprocess((v) => String(v || "any"), z.string()),
        stationRig: z.preprocess((v) => String(v || "auto"), z.string()),
        notes: z.preprocess((v) => String(v || ""), z.string()),
        snacksOrdered: z.preprocess((v) => String(v || ""), z.string().optional()),
        source: z.preprocess((v) => (["offline", "whatsapp", "online"].includes(String(v)) ? v : "offline"), z.enum(["offline", "whatsapp", "online"])),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const {
      sqlInsertBooking,
      sqlCheckRigConflict,
      sqlAutoAssignRig,
      getIndianDateToday,
      getIndianTimeNowMinutes,
    } = await import("@/lib/db.server");
    const validParty = Math.min(5, Math.max(1, data.partySize));
    const validDur = [1, 2, 3].includes(data.durationHours) ? data.durationHours : 1;
    const estimatedTotal = calculateSessionPrice(validParty as any, validDur as any);

    let assignedRig = (data.stationRig || "").trim();

    // If auto-assign or unassigned requested
    if (!assignedRig || assignedRig.toLowerCase() === "auto" || assignedRig.toLowerCase() === "unassigned") {
      const autoRes = await sqlAutoAssignRig(
        data.visitDate,
        data.visitTime,
        validDur,
        data.notes || data.gameGenre
      );
      if (autoRes.allOccupied || !autoRes.assignedRig) {
        return {
          success: false,
          error: autoRes.message || "All 5 PS5 stations are fully occupied during this slot.",
        };
      }
      assignedRig = autoRes.assignedRig;
    } else {
      // Validate that the requested rig is NOT already occupied
      const conflict = await sqlCheckRigConflict(
        data.visitDate,
        data.visitTime,
        validDur,
        assignedRig
      );
      if (conflict.hasConflict) {
        return {
          success: false,
          error: conflict.message || "This station is already occupied during this time window.",
        };
      }
    }

    const today = getIndianDateToday();
    const isTodaySession = data.visitDate === today;

    // Only set session_started_at if this is an immediate walk-in starting right now!
    // If it's a scheduled slot for later today (e.g. 10:00 AM or 11:00 AM), session has NOT started yet!
    const [qh, qm] = data.visitTime.split(":").map(Number);
    const reqStart = (qh || 0) * 60 + (qm || 0);
    const reqEnd = reqStart + validDur * 60;
    const istCurrentMinutes = getIndianTimeNowMinutes();
    const isStartingRightNow =
      isTodaySession && istCurrentMinutes >= reqStart - 5 && istCurrentMinutes <= reqEnd;

    const newBooking = await sqlInsertBooking({
      customer_name: data.customerName,
      phone: data.phone,
      contact_method: data.contactMethod,
      visit_date: data.visitDate,
      visit_time: data.visitTime,
      party_size: validParty,
      duration_hours: validDur,
      game_genre: data.gameGenre,
      notes: data.notes,
      estimated_total: estimatedTotal,
      status: "confirmed",
      station_rig: assignedRig,
      source: data.source,
      snacks_ordered: data.snacksOrdered || "",
      session_started_at: isStartingRightNow ? new Date().toISOString() : null,
    });

    return { success: true, booking: newBooking };
  });

// 6. Admin: Update Booking Status & Assigned Rig (with Strict Conflict Protection)
export const adminUpdateBookingStatusFn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token: string;
      bookingId: string;
      status: "pending" | "confirmed" | "completed" | "cancelled";
      stationRig?: string;
    }) =>
      z
        .object({
          token: z.string(),
          bookingId: z.string(),
          status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
          stationRig: z.string().optional(),
        })
        .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlUpdateBookingStatus, sqlGetAllBookings, sqlCheckRigConflict, sqlAutoAssignRig } =
      await import("@/lib/db.server");

    // When confirming or changing station rig, prevent double booking
    if (data.status === "confirmed") {
      const all = await sqlGetAllBookings();
      const target = all.find((b) => b.id === data.bookingId);
      if (target) {
        let rigToAssign = data.stationRig?.trim() || target.station_rig;

        if (!rigToAssign || rigToAssign.toLowerCase() === "auto" || rigToAssign.toLowerCase() === "unassigned") {
          const autoRes = await sqlAutoAssignRig(
            target.visit_date,
            target.visit_time,
            target.duration_hours,
            target.notes || target.game_genre,
            data.bookingId
          );
          if (autoRes.allOccupied || !autoRes.assignedRig) {
            return {
              success: false,
              error: autoRes.message || "All 5 PS5 stations are fully occupied during this slot.",
            };
          }
          rigToAssign = autoRes.assignedRig;
          data.stationRig = rigToAssign;
        } else {
          const conflict = await sqlCheckRigConflict(
            target.visit_date,
            target.visit_time,
            target.duration_hours,
            rigToAssign,
            data.bookingId
          );
          if (conflict.hasConflict) {
            return {
              success: false,
              error: conflict.message || "This station is already occupied for this time slot.",
            };
          }
        }
      }
    }

    await sqlUpdateBookingStatus(data.bookingId, data.status, data.stationRig);
    return { success: true, assignedRig: data.stationRig };
  });

// 6b. Admin: One-click Auto-Assign Rig to Booking
export const adminAutoAssignBookingFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; bookingId: string }) =>
    z.object({ token: z.string(), bookingId: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetAllBookings, sqlAutoAssignRig, sqlUpdateBookingStatus } = await import("@/lib/db.server");
    const all = await sqlGetAllBookings();
    const target = all.find((b) => b.id === data.bookingId);
    if (!target) return { success: false, error: "Booking not found." };

    const autoRes = await sqlAutoAssignRig(
      target.visit_date,
      target.visit_time,
      target.duration_hours,
      target.notes || target.game_genre,
      data.bookingId
    );

    if (autoRes.allOccupied || !autoRes.assignedRig) {
      return { success: false, error: autoRes.message };
    }

    await sqlUpdateBookingStatus(data.bookingId, "confirmed", autoRes.assignedRig);
    return { success: true, assignedRig: autoRes.assignedRig, message: autoRes.message };
  });

// 6c. Check Availability of All 5 Rigs for a Specific Slot (Used by Desk Walk-in Form)
export const checkRigSlotAvailabilityFn = createServerFn({ method: "GET" })
  .validator(
    (input: { visitDate: string; visitTime: string; durationHours: number; excludeBookingId?: string }) =>
      z
        .object({
          visitDate: z.string(),
          visitTime: z.string(),
          durationHours: z.number().int().min(1).max(3),
          excludeBookingId: z.string().optional(),
        })
        .parse(input)
  )
  .handler(async ({ data }) => {
    const { sqlGetRigsAvailabilityForSlot } = await import("@/lib/db.server");
    const rigs = await sqlGetRigsAvailabilityForSlot(
      data.visitDate,
      data.visitTime,
      data.durationHours,
      data.excludeBookingId
    );
    return { rigs };
  });

// 7. Admin: Extend Active Session (+30m or +1h)
export const adminExtendBookingFn = createServerFn({ method: "POST" })
  .validator(
    (input: { token: string; bookingId: string; additionalHours: number; additionalCost: number }) =>
      z
        .object({
          token: z.string(),
          bookingId: z.string(),
          additionalHours: z.number().positive(),
          additionalCost: z.number().nonnegative(),
        })
        .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlExtendBooking } = await import("@/lib/db.server");
    await sqlExtendBooking(data.bookingId, data.additionalHours, data.additionalCost);
    return { success: true };
  });

// 8. Admin: Get Managed Games (via SQL)
export const adminGetGamesFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetManagedGames } = await import("@/lib/db.server");
    const games = await sqlGetManagedGames();
    return { success: true, games };
  });

// 9. Admin: Add New Game
export const adminAddGameFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    return z
      .object({
        token: z.string(),
        id: z.string(),
        title: z.string().min(2),
        genre: z.string(),
        genre_label: z.string(),
        players: z.string(),
        tagline: z.string(),
        badge: z.string().optional(),
        cover: z.string(),
        source: z.string().default("ps-plus"),
        copies_count: z.number().int().min(1).default(5),
        is_new_arrival: z.boolean().default(false),
        is_featured: z.boolean().default(false),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlAddManagedGame } = await import("@/lib/db.server");
    await sqlAddManagedGame({
      id: data.id,
      title: data.title,
      genre: data.genre,
      genre_label: data.genre_label,
      players: data.players,
      tagline: data.tagline,
      badge: data.badge,
      cover: data.cover,
      source: data.source,
      copies_count: data.copies_count,
      is_new_arrival: data.is_new_arrival,
      is_featured: data.is_featured,
    });
    return { success: true };
  });

// 10. Admin: Modify / Update Existing Game
export const adminUpdateGameFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    return z
      .object({
        token: z.string(),
        id: z.string(),
        title: z.string().min(2),
        genre: z.string(),
        genre_label: z.string(),
        players: z.string(),
        tagline: z.string(),
        badge: z.string().optional(),
        cover: z.string(),
        source: z.string(),
        copies_count: z.number().int().min(1),
        is_new_arrival: z.boolean(),
        is_featured: z.boolean(),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlUpdateManagedGame } = await import("@/lib/db.server");
    await sqlUpdateManagedGame({
      id: data.id,
      title: data.title,
      genre: data.genre,
      genre_label: data.genre_label,
      players: data.players,
      tagline: data.tagline,
      badge: data.badge,
      cover: data.cover,
      source: data.source,
      copies_count: data.copies_count,
      is_new_arrival: data.is_new_arrival,
      is_featured: data.is_featured,
    });
    return { success: true };
  });

// 11. Admin: Delete Game
export const adminDeleteGameFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string }) =>
    z.object({ token: z.string(), id: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlDeleteManagedGame } = await import("@/lib/db.server");
    await sqlDeleteManagedGame(data.id);
    return { success: true };
  });

// 12. Admin: Pricing Rates Config
export const adminGetPricingFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetPricing } = await import("@/lib/db.server");
    const pricing = await sqlGetPricing();
    return { success: true, pricing };
  });

export const adminUpdatePricingFn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token: string;
      partySize: number;
      durationHours: number;
      price: number;
    }) =>
      z
        .object({
          token: z.string(),
          partySize: z.number().int().min(1).max(5),
          durationHours: z.number().int().min(1).max(3),
          price: z.number().int().positive(),
        })
        .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlUpdatePricing } = await import("@/lib/db.server");
    await sqlUpdatePricing(data.partySize, data.durationHours, data.price);
    return { success: true };
  });

// 13. Snacks & Combos Menu
export const getPublicSnacksFn = createServerFn({ method: "GET" }).handler(async () => {
  const { sqlGetSnacks } = await import("@/lib/db.server");
  return await sqlGetSnacks();
});

export const adminGetSnacksFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetSnacks } = await import("@/lib/db.server");
    const snacks = await sqlGetSnacks();
    return { success: true, snacks };
  });

export const adminAddSnackFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    return z
      .object({
        token: z.string(),
        name: z.string().min(2),
        category: z.string(),
        price: z.number().int().positive(),
        is_combo: z.boolean(),
        combo_description: z.string().optional(),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlAddSnack } = await import("@/lib/db.server");
    await sqlAddSnack({
      name: data.name,
      category: data.category,
      price: data.price,
      is_combo: data.is_combo,
      combo_description: data.combo_description,
    });
    return { success: true };
  });

export const adminUpdateSnackFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    return z
      .object({
        token: z.string(),
        id: z.string(),
        name: z.string().min(2),
        category: z.string(),
        price: z.number().int().positive(),
        is_combo: z.boolean(),
        combo_description: z.string().optional(),
        is_available: z.boolean(),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlUpdateSnack } = await import("@/lib/db.server");
    await sqlUpdateSnack({
      id: data.id,
      name: data.name,
      category: data.category,
      price: data.price,
      is_combo: data.is_combo,
      combo_description: data.combo_description,
      is_available: data.is_available,
    });
    return { success: true };
  });

export const adminDeleteSnackFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string }) =>
    z.object({ token: z.string(), id: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlDeleteSnack } = await import("@/lib/db.server");
    await sqlDeleteSnack(data.id);
    return { success: true };
  });

// 15. Gamer Passes & Digital Loyalty
export const adminGetGamerPassesFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetGamerPasses } = await import("@/lib/db.server");
    const passes = await sqlGetGamerPasses();
    return { success: true, passes };
  });

export const adminIssueGamerPassFn = createServerFn({ method: "POST" })
  .validator((input: any) => {
    return z
      .object({
        token: z.string().min(1, "Authentication required"),
        customer_name: z.preprocess((v) => String(v || "").trim() || "Player", z.string().min(1)),
        phone: z.preprocess((v) => String(v || "").trim() || "8498833389", z.string().min(5)),
        gamer_tag: z.preprocess((v) => String(v || "").trim() || "ArenaGamer", z.string().min(1)),
        total_hours: z.preprocess((v) => Math.max(1, Math.round(Number(v) || 5)), z.number().int().positive()),
        price_paid: z.preprocess((v) => Math.max(0, Math.round(Number(v) || 450)), z.number().int().nonnegative()),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlIssueGamerPass } = await import("@/lib/db.server");
    const pass = await sqlIssueGamerPass(data);
    return { success: true, pass };
  });

export const adminDeductPassHoursFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; passCode: string; hoursToDeduct: number }) =>
    z
      .object({
        token: z.string(),
        passCode: z.string().trim(),
        hoursToDeduct: z.number().positive(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlDeductPassHours } = await import("@/lib/db.server");
    return await sqlDeductPassHours(data.passCode, data.hoursToDeduct);
  });

export const adminTopUpGamerPassFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; passCode: string; hoursToAdd: number; additionalPrice: number }) =>
    z
      .object({
        token: z.string(),
        passCode: z.string().trim(),
        hoursToAdd: z.number().int().positive(),
        additionalPrice: z.number().int().nonnegative(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlTopUpGamerPass } = await import("@/lib/db.server");
    return await sqlTopUpGamerPass(data.passCode, data.hoursToAdd, data.additionalPrice);
  });

export const adminDeleteGamerPassFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string }) =>
    z.object({ token: z.string(), id: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlDeleteGamerPass } = await import("@/lib/db.server");
    await sqlDeleteGamerPass(data.id);
    return { success: true };
  });

// 16. Business Analytics
export const adminGetAnalyticsFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetAnalytics } = await import("@/lib/db.server");
    const analytics = await sqlGetAnalytics();
    return { success: true, analytics };
  });

// 17. In-Game Station QR Orders
export const submitStationOrderFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    return z
      .object({
        station_rig: z.string().min(1),
        service_type: z.string().default("snacks"),
        items_json: z.string().default("[]"),
        total_amount: z.number().int().nonnegative().default(0),
        customer_name: z.string().optional(),
        notes: z.string().optional(),
        payment_method: z.string().default("cash"),
      })
      .parse(input);
  })
  .handler(async ({ data }) => {
    const { sqlSubmitStationOrder } = await import("@/lib/db.server");
    const order = await sqlSubmitStationOrder(data);
    return { success: true, order };
  });

export const adminGetStationOrdersFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetStationOrders } = await import("@/lib/db.server");
    const orders = await sqlGetStationOrders();
    return { success: true, orders };
  });

export const adminUpdateStationOrderStatusFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string; status: string }) =>
    z.object({ token: z.string(), id: z.string(), status: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlUpdateStationOrderStatus } = await import("@/lib/db.server");
    await sqlUpdateStationOrderStatus(data.id, data.status);
    return { success: true };
  });

// 18. Public Gamer Pass Checker
export const checkGamerPassBalanceFn = createServerFn({ method: "POST" })
  .validator((input: { query: string }) =>
    z.object({ query: z.string().trim().min(1, "Enter a pass code, gamer tag, or phone number") }).parse(input)
  )
  .handler(async ({ data }) => {
    const { sqlGetGamerPassByQuery } = await import("@/lib/db.server");
    const pass = await sqlGetGamerPassByQuery(data.query);
    if (!pass) {
      return { success: false, message: "No gamer pass found for that code or gamer tag." };
    }
    return { success: true, pass };
  });

// 19. Lounge TV Live Status Board
export const getPublicLoungeTvStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { sqlGetLoungeTvStatus } = await import("@/lib/db.server");
  return await sqlGetLoungeTvStatus();
});

// 20. Admin: Get Day Schedule & Hourly Matrix (Playo-Style Dashboard)
export const adminGetDayScheduleFn = createServerFn({ method: "GET" })
  .validator((input: { token: string; visitDate: string }) =>
    z
      .object({
        token: z.string().min(1),
        visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetDaySchedule } = await import("@/lib/db.server");
    return await sqlGetDaySchedule(data.visitDate);
  });

// 21. Admin: Check-In Player & Start Live Session Today
export const adminCheckInBookingFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; bookingId: string }) =>
    z.object({ token: z.string().min(1), bookingId: z.string() }).parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlCheckInBooking } = await import("@/lib/db.server");
    await sqlCheckInBooking(data.bookingId);
    return { success: true };
  });

// 22. Public: Get Approved Testimonials
export const getPublicTestimonialsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { sqlGetPublicTestimonials } = await import("@/lib/db.server");
  return await sqlGetPublicTestimonials();
});

// 23. Public: Submit Testimonial / Review Comment
export const submitTestimonialFn = createServerFn({ method: "POST" })
  .validator((input: {
    customerName: string;
    role?: string;
    rating: number;
    comment: string;
    favoriteGame?: string;
    stationRig?: string;
  }) =>
    z
      .object({
        customerName: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
        role: z.string().trim().max(40).optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().trim().min(5, "Review must be at least 5 characters").max(600),
        favoriteGame: z.string().trim().max(60).optional(),
        stationRig: z.string().trim().max(60).optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { sqlAddTestimonial } = await import("@/lib/db.server");
    const testimonial = await sqlAddTestimonial({
      customer_name: data.customerName,
      role: data.role || "Gamer",
      rating: data.rating,
      comment: data.comment,
      favorite_game: data.favoriteGame || "",
      station_rig: data.stationRig || "",
      status: "approved",
    });
    return { success: true, testimonial };
  });

// 24. Admin: Get All Testimonials
export const adminGetTestimonialsFn = createServerFn({ method: "GET" })
  .validator((input: { token: string }) => z.object({ token: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlGetAllTestimonialsAdmin } = await import("@/lib/db.server");
    return await sqlGetAllTestimonialsAdmin();
  });

// 25. Admin: Update Testimonial Status (approved, pending, hidden)
export const adminUpdateTestimonialStatusFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string; status: "approved" | "pending" | "hidden" }) =>
    z
      .object({
        token: z.string().min(1),
        id: z.string().min(1),
        status: z.enum(["approved", "pending", "hidden"]),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlUpdateTestimonialStatus } = await import("@/lib/db.server");
    await sqlUpdateTestimonialStatus(data.id, data.status);
    return { success: true };
  });

// 26. Admin: Toggle Pin / Featured on Testimonial
export const adminToggleTestimonialFeaturedFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string; isFeatured: boolean }) =>
    z
      .object({
        token: z.string().min(1),
        id: z.string().min(1),
        isFeatured: z.boolean(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlToggleTestimonialFeatured } = await import("@/lib/db.server");
    await sqlToggleTestimonialFeatured(data.id, data.isFeatured ? 1 : 0);
    return { success: true };
  });

// 27. Admin: Delete Testimonial
export const adminDeleteTestimonialFn = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string }) =>
    z
      .object({
        token: z.string().min(1),
        id: z.string().min(1),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    if (!data.token) throw new Error("Unauthorized");
    const { sqlDeleteTestimonial } = await import("@/lib/db.server");
    await sqlDeleteTestimonial(data.id);
    return { success: true };
  });
