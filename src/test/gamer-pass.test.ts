import { describe, expect, it } from "vitest";
import {
  sqlIssueGamerPass,
  sqlDeductPassHours,
  sqlTopUpGamerPass,
  sqlGetGamerPassByQuery,
  sqlDeleteGamerPass,
} from "@/lib/db.server";

describe("gamer pass lifecycle and top-up engine", () => {
  it("issues a pass, deducts hours, tops up hours, and restores active status", async () => {
    // 1. Issue a test pass with 10 hours for ₹850
    const issued = await sqlIssueGamerPass({
      customer_name: "Test Gamer TopUp",
      phone: "919876543210",
      gamer_tag: "TOPUP_PRO_99",
      total_hours: 10,
      price_paid: 850,
    });

    expect(issued.pass_code).toMatch(/^ARENA-/);
    expect(issued.remaining_hours).toBe(10);
    expect(issued.total_hours).toBe(10);
    expect(issued.price_paid).toBe(850);
    expect(issued.status).toBe("active");

    const passCode = issued.pass_code;

    // 2. Deduct all 10 hours so the pass becomes exhausted (0 hours remaining)
    const deduct1 = await sqlDeductPassHours(passCode, 10);
    expect(deduct1.success).toBe(true);
    expect(deduct1.remaining).toBe(0);

    const checkedExhausted = await sqlGetGamerPassByQuery(passCode);
    expect(checkedExhausted.remaining_hours).toBe(0);
    expect(checkedExhausted.status).toBe("exhausted");

    // 3. Top up the pass with +5 hours for ₹450
    const topUpRes = await sqlTopUpGamerPass(passCode, 5, 450);
    expect(topUpRes.success).toBe(true);
    expect(topUpRes.remaining).toBe(5);
    expect(topUpRes.total).toBe(15);
    expect(topUpRes.pass.remaining_hours).toBe(5);
    expect(topUpRes.pass.total_hours).toBe(15);
    expect(topUpRes.pass.hours_added).toBe(5);
    expect(topUpRes.pass.amount_paid).toBe(450);

    // 4. Verify the pass is active again with updated hours and price
    const checkedActive = await sqlGetGamerPassByQuery(passCode);
    expect(checkedActive.remaining_hours).toBe(5);
    expect(checkedActive.total_hours).toBe(15);
    expect(checkedActive.price_paid).toBe(1300); // 850 + 450
    expect(checkedActive.status).toBe("active");

    // 5. Cleanup
    await sqlDeleteGamerPass(checkedActive.id);
  });

  it("fails gracefully when attempting to top up an invalid pass code", async () => {
    const res = await sqlTopUpGamerPass("NON_EXISTENT_CODE_XYZ", 10, 850);
    expect(res.success).toBe(false);
    expect(res.message).toContain("not found");
  });
});
