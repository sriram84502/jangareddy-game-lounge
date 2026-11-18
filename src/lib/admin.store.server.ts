import { z } from "zod";
import { calculateSessionPrice, type SessionDuration } from "@/lib/pricing";

export interface BookingRecord {
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
  created_at: string;
  station_rig?: string;
  source?: "online" | "offline" | "whatsapp";
}

// In-memory persistent server store with seed data for Jangareddygudem lounge
const memoryBookings: BookingRecord[] = [
  {
    id: "booking-seed-1",
    customer_name: "Karthik Varma",
    phone: "8498833389",
    contact_method: "whatsapp",
    visit_date: new Date().toISOString().slice(0, 10),
    visit_time: "15:00",
    party_size: 4,
    duration_hours: 2,
    game_genre: "sports",
    notes: "EA SPORTS FC 24 with 4 friends · Rig 01",
    estimated_total: 450,
    status: "confirmed",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    station_rig: "Rig 01 · DualSense 1v1 Arena",
    source: "whatsapp",
  },
  {
    id: "booking-seed-2",
    customer_name: "Rahul Maddipati",
    phone: "9848012345",
    contact_method: "phone",
    visit_date: new Date().toISOString().slice(0, 10),
    visit_time: "17:30",
    party_size: 2,
    duration_hours: 1,
    game_genre: "open-world",
    notes: "GTA V 4K Ray Tracing · Rig 02",
    estimated_total: 150,
    status: "confirmed",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    station_rig: "Rig 02 · Vice City Ready",
    source: "online",
  },
  {
    id: "booking-seed-3",
    customer_name: "Suresh G.",
    phone: "9123456789",
    contact_method: "whatsapp",
    visit_date: new Date().toISOString().slice(0, 10),
    visit_time: "19:00",
    party_size: 2,
    duration_hours: 2,
    game_genre: "fighting",
    notes: "TEKKEN 8 1v1 Battle · Rig 03",
    estimated_total: 270,
    status: "pending",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    station_rig: "Rig 03 · Fighting Colosseum",
    source: "online",
  },
];

// Helper to convert "HH:MM" to minutes from midnight
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Check overlapping bookings for a given time window
export function getOverlappingBookings(
  visitDate: string,
  startTime: string,
  durationHours: number,
  allBookings: BookingRecord[]
): BookingRecord[] {
  const reqStart = timeToMinutes(startTime);
  const reqEnd = reqStart + durationHours * 60;

  return allBookings.filter((b) => {
    if (b.visit_date !== visitDate) return false;
    if (b.status === "cancelled") return false;

    const bStart = timeToMinutes(b.visit_time);
    const bEnd = bStart + b.duration_hours * 60;

    // Overlap condition: reqStart < bEnd && reqEnd > bStart
    return reqStart < bEnd && reqEnd > bStart;
  });
}

// Server function helper: Fetch all bookings (Supabase first, memory fallback)
export async function getAllBookingsServer(): Promise<BookingRecord[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("booking_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      // Merge memory bookings that are not in Supabase
      const supabaseIds = new Set(data.map((item) => item.id));
      const additional = memoryBookings.filter((b) => !supabaseIds.has(b.id));
      return [...(data as BookingRecord[]), ...additional];
    }
  } catch {
    // If Supabase is not configured locally, fallback to in-memory store
  }

  return [...memoryBookings].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// Server function helper: Insert booking
export async function insertBookingServer(
  record: Omit<BookingRecord, "id" | "created_at">
): Promise<BookingRecord> {
  const newBooking: BookingRecord = {
    ...record,
    id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  memoryBookings.unshift(newBooking);

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("booking_requests").insert({
      customer_name: newBooking.customer_name,
      phone: newBooking.phone,
      contact_method: newBooking.contact_method,
      visit_date: newBooking.visit_date,
      visit_time: newBooking.visit_time,
      party_size: newBooking.party_size,
      duration_hours: newBooking.duration_hours,
      game_genre: newBooking.game_genre,
      notes: newBooking.notes,
      estimated_total: newBooking.estimated_total,
      status: newBooking.status,
    });
  } catch {
    // Supabase optional fallback
  }

  return newBooking;
}

// Server function helper: Update status
export async function updateBookingStatusServer(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
  stationRig?: string
): Promise<boolean> {
  const item = memoryBookings.find((b) => b.id === id);
  if (item) {
    item.status = status;
    if (stationRig) item.station_rig = stationRig;
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("booking_requests")
      .update({ status })
      .eq("id", id);
  } catch {
    // Supabase optional fallback
  }

  return true;
}
