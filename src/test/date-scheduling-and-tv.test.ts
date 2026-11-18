import { describe, expect, it } from "vitest";
import {
  sqlInsertBooking,
  sqlUpdateBookingStatus,
  sqlGetDaySchedule,
  sqlGetDaySlotsAvailability,
  sqlGetLoungeTvStatus,
  getIndianDateToday,
  getSqlDatabase,
} from "@/lib/db.server";

describe("date-based scheduling, online vs store bookings, and TV isolation", () => {
  it("never sets session_started_at for a booking on another/future date", async () => {
    const futureDate = `2099-12-${Math.floor(10 + Math.random() * 18)}`;

    const inserted = await sqlInsertBooking({
      customer_name: "Future Gamer",
      phone: "9188888888",
      contact_method: "whatsapp",
      visit_date: futureDate,
      visit_time: "15:00",
      party_size: 2,
      duration_hours: 2,
      game_genre: "sports",
      notes: "EA FC 24",
      estimated_total: 300,
      status: "pending",
      station_rig: "Rig 01 · DualSense 1v1 Arena",
      source: "online",
      session_started_at: new Date().toISOString(), // Even if passed, server must nullify it for future dates!
    });

    expect(inserted.session_started_at).toBeNull();

    // Confirming a future booking must also keep session_started_at null
    await sqlUpdateBookingStatus(inserted.id, "confirmed", "Rig 01 · DualSense 1v1 Arena");

    const schedule = await sqlGetDaySchedule(futureDate);
    const updated = schedule.bookings.find((b) => b.id === inserted.id);
    expect(updated?.status).toBe("confirmed");
    expect(updated?.session_started_at).toBeNull();
  });

  it("isolates TV status so other date bookings never appear as active on TV", async () => {
    const today = getIndianDateToday();
    const otherDate = `2098-05-${Math.floor(10 + Math.random() * 18)}`;

    // Book on another date
    await sqlInsertBooking({
      customer_name: "Other Date Gamer",
      phone: "9177777777",
      contact_method: "whatsapp",
      visit_date: otherDate,
      visit_time: "16:00",
      party_size: 1,
      duration_hours: 1,
      game_genre: "open-world",
      notes: "GTA VI",
      estimated_total: 100,
      status: "confirmed",
      station_rig: "Rig 02 · Vice City Ready",
      source: "online",
    });

    // TV status board must only contain bookings for TODAY in Indian local time
    const tvStatus = await sqlGetLoungeTvStatus();
    expect(tvStatus.today).toBe(today);

    const hasOtherDateBooking = tvStatus.todayBookings.some((b: any) => b.visit_date === otherDate);
    expect(hasOtherDateBooking).toBe(false);
  });

  it("correctly breaks down online vs store vs WhatsApp bookings in day schedule matrix", async () => {
    const testDate = `2099-06-${Math.floor(10 + Math.random() * 18)}`;
    const db = await getSqlDatabase();
    db.run("DELETE FROM bookings WHERE visit_date = ?", [testDate]);

    // 1 Online booking on Rig 01 from 14:00 (1 hour)
    await sqlInsertBooking({
      customer_name: "Online User",
      phone: "9876543210",
      contact_method: "whatsapp",
      visit_date: testDate,
      visit_time: "14:00",
      party_size: 1,
      duration_hours: 1,
      game_genre: "action-adventure",
      notes: "Spider-Man 2",
      estimated_total: 100,
      status: "confirmed",
      station_rig: "Rig 01 · DualSense 1v1 Arena",
      source: "online",
    });

    // 1 Store / Walk-in booking on Rig 02 from 14:00 (1 hour)
    await sqlInsertBooking({
      customer_name: "Store Walk-in User",
      phone: "9876543211",
      contact_method: "phone",
      visit_date: testDate,
      visit_time: "14:00",
      party_size: 2,
      duration_hours: 1,
      game_genre: "sports",
      notes: "EA FC 24",
      estimated_total: 150,
      status: "confirmed",
      station_rig: "Rig 02 · Vice City Ready",
      source: "offline",
    });

    // 1 WhatsApp booking on Rig 03 from 14:00 (2 hours)
    await sqlInsertBooking({
      customer_name: "WhatsApp User",
      phone: "9876543212",
      contact_method: "whatsapp",
      visit_date: testDate,
      visit_time: "14:00",
      party_size: 4,
      duration_hours: 2,
      game_genre: "fighting",
      notes: "TEKKEN 8",
      estimated_total: 450,
      status: "confirmed",
      station_rig: "Rig 03 · Fighting Colosseum",
      source: "whatsapp",
    });

    const schedule = await sqlGetDaySchedule(testDate);
    expect(schedule.metrics.totalBookings).toBe(3);
    expect(schedule.metrics.onlineBookings).toBe(1);
    expect(schedule.metrics.storeBookings).toBe(1);
    expect(schedule.metrics.whatsappBookings).toBe(1);

    // Slot 14:00 should show 3 occupied rigs (1 online, 1 store, 1 whatsapp) and 2 free rigs
    const slot14 = schedule.slots.find((s) => s.time === "14:00");
    expect(slot14).toBeDefined();
    expect(slot14?.occupiedCount).toBe(3);
    expect(slot14?.availableCount).toBe(2);
    expect(slot14?.onlineCount).toBe(1);
    expect(slot14?.storeCount).toBe(1);
    expect(slot14?.whatsappCount).toBe(1);

    // Rigs 04 and 05 must be free in slot 14:00
    const rig04 = slot14?.rigs.find((r) => r.rig.startsWith("Rig 04"));
    const rig05 = slot14?.rigs.find((r) => r.rig.startsWith("Rig 05"));
    expect(rig04?.isOccupied).toBe(false);
    expect(rig05?.isOccupied).toBe(false);
  });

  it("returns Playo-style all-slot availability for customer booking interface", async () => {
    const testDate = "2099-07-10";

    const availability = await sqlGetDaySlotsAvailability(testDate, 1);
    expect(availability.date).toBe(testDate);
    expect(availability.slots.length).toBeGreaterThanOrEqual(12);

    // Each slot has Playo availability tags
    const firstSlot = availability.slots[0];
    expect(firstSlot).toHaveProperty("time");
    expect(firstSlot).toHaveProperty("label");
    expect(firstSlot).toHaveProperty("availableRigsCount");
    expect(firstSlot).toHaveProperty("isAvailable");
    expect(firstSlot.availableRigsCount).toBe(5);
    expect(firstSlot.isAvailable).toBe(true);
  });

  it("does not start session prematurely for today's booking when scheduled for a future slot (e.g. 10:00 AM)", async () => {
    const today = getIndianDateToday();

    // Insert a confirmed booking for today at 10:00 AM
    const booking10 = await sqlInsertBooking({
      customer_name: "Morning Gamer",
      phone: "9888888888",
      contact_method: "whatsapp",
      visit_date: today,
      visit_time: "10:00",
      party_size: 1,
      duration_hours: 1,
      game_genre: "sports",
      notes: "FC 25",
      estimated_total: 100,
      status: "confirmed",
      station_rig: "Rig 01 · DualSense 1v1 Arena",
      source: "store",
      session_started_at: null,
    });

    // Confirming or updating status should NOT set session_started_at
    await sqlUpdateBookingStatus(booking10.id, "confirmed", "Rig 01 · DualSense 1v1 Arena");

    const tvStatus = await sqlGetLoungeTvStatus();
    const found = tvStatus.todayBookings.find((b) => b.id === booking10.id);
    expect(found).toBeDefined();
    // session_started_at must remain NULL until check-in or arrival time
    expect(found?.session_started_at).toBeNull();
  });

  it("provides comprehensive day slot data for One-Box Booked vs Available view", async () => {
    const testDate = `2099-08-15`;
    const schedule = await sqlGetDaySchedule(testDate);
    expect(schedule.slots).toHaveLength(13); // 10:00 to 22:00
    for (const slot of schedule.slots) {
      expect(slot.rigs).toHaveLength(5);
      expect(slot.occupiedCount + slot.availableCount).toBe(5);
    }
  });
});
