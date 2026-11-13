import { describe, expect, it } from "vitest";

import { calculateSessionPrice } from "@/lib/pricing";

describe("session pricing per person", () => {
  it("charges ₹100 per person for one hour", () => {
    expect(calculateSessionPrice(1, 1)).toBe(100);
  });

  it("charges ₹180 per person for two hours", () => {
    expect(calculateSessionPrice(1, 2)).toBe(180);
  });

  it("charges ₹250 per person for three hours", () => {
    expect(calculateSessionPrice(1, 3)).toBe(250);
  });

  it("multiplies the per-person price by the group size", () => {
    expect(calculateSessionPrice(4, 2)).toBe(720);
  });
});