import { describe, expect, it } from "vitest";
import {
  matchRigName,
  sqlCheckRigConflict,
  sqlAutoAssignRig,
  sqlInsertBooking,
  getSqlDatabase,
  PS5_STATIONS,
} from "@/lib/db.server";

describe("rig occupancy and conflict engine", () => {
  it("matches rig names across formats and case variations", () => {
    expect(matchRigName("Rig 01", "Rig 01 · DualSense 1v1 Arena")).toBe(true);
    expect(matchRigName("rig 02", "Rig 02 · Vice City Ready")).toBe(true);
    expect(matchRigName("Rig 1", "Rig 01")).toBe(true);
    expect(matchRigName("Rig 03", "Rig 05")).toBe(false);
  });

  it("detects conflict when a rig is occupied from 16:00 to 17:00 (4-5 PM)", async () => {
    const testDate = `2099-01-01`;

    // Insert an existing confirmed booking on Rig 01 from 16:00 (1 hour, ends at 17:00)
    await sqlInsertBooking({
      customer_name: "Original Gamer",
      phone: "9999999999",
      contact_method: "whatsapp",
      visit_date: testDate,
      visit_time: "16:00",
      party_size: 1,
      duration_hours: 1,
      game_genre: "sports",
      notes: "EA FC 24",
      estimated_total: 100,
      status: "confirmed",
      station_rig: "Rig 01 · DualSense 1v1 Arena",
      source: "offline",
      created_at: new Date().toISOString(),
    });

    // 1. Trying to book Rig 01 at 16:00 (exact overlap)
    const exactConflict = await sqlCheckRigConflict(testDate, "16:00", 1, "Rig 01 · DualSense 1v1 Arena");
    expect(exactConflict.hasConflict).toBe(true);
    expect(exactConflict.message).toContain("Rig 01 is already occupied");

    // 2. Trying to book Rig 01 from 16:30 to 17:30 (partial overlap)
    const partialConflict = await sqlCheckRigConflict(testDate, "16:30", 1, "Rig 01");
    expect(partialConflict.hasConflict).toBe(true);

    // 3. Trying to book Rig 01 from 15:30 to 16:30 (starts before, ends during)
    const overlapBefore = await sqlCheckRigConflict(testDate, "15:30", 1, "Rig 01");
    expect(overlapBefore.hasConflict).toBe(true);

    // 4. Booking Rig 01 right after at 17:00 (back-to-back, no conflict)
    const backToBack = await sqlCheckRigConflict(testDate, "17:00", 1, "Rig 01");
    expect(backToBack.hasConflict).toBe(false);

    // 5. Booking Rig 02 at 16:00 (different rig, no conflict)
    const diffRig = await sqlCheckRigConflict(testDate, "16:00", 1, "Rig 02 · Vice City Ready");
    expect(diffRig.hasConflict).toBe(false);
  });

  it("auto-assigns the next available rig when none is specified", async () => {
    const testDate = `2099-01-02`;

    // Fill Rig 01 at 14:00
    await sqlInsertBooking({
      customer_name: "Gamer 1",
      phone: "9999999999",
      contact_method: "whatsapp",
      visit_date: testDate,
      visit_time: "14:00",
      party_size: 1,
      duration_hours: 1,
      game_genre: "sports",
      notes: "EA FC 24",
      estimated_total: 100,
      status: "confirmed",
      station_rig: PS5_STATIONS[0],
      source: "offline",
      created_at: new Date().toISOString(),
    });

    // Auto-assign should skip Rig 01 and assign Rig 02
    const autoResult = await sqlAutoAssignRig(testDate, "14:00", 1);
    expect(autoResult.allOccupied).toBe(false);
    expect(autoResult.assignedRig).toBe(PS5_STATIONS[1]); // Rig 02
  });

  it("auto-assigns only Rig 01 or Rig 02 for GTA VI physical discs", async () => {
    const testDate = `2099-01-03`;

    // Auto-assign for GTA 6
    const gtaResult = await sqlAutoAssignRig(testDate, "15:00", 1, "Grand Theft Auto VI");
    expect(gtaResult.allOccupied).toBe(false);
    expect(gtaResult.assignedRig).toMatch(/Rig 01|Rig 02/);
  });
});
