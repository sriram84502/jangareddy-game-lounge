import { describe, expect, it } from "vitest";

import { calculateSessionPrice } from "@/lib/pricing";

describe("group session pricing", () => {
  it.each([
    [1, 1, 100], [1, 2, 180], [1, 3, 250],
    [2, 1, 150], [2, 2, 270], [2, 3, 375],
    [3, 1, 200], [3, 2, 360], [3, 3, 500],
    [4, 1, 250], [4, 2, 450], [4, 3, 625],
    [5, 1, 300], [5, 2, 540], [5, 3, 750],
  ])("charges ₹%i for %i people for %i hour(s)", (people, hours, total) => {
    expect(calculateSessionPrice(people, hours)).toBe(total);
  });

  it("rejects group sizes without an approved rate", () => {
    expect(() => calculateSessionPrice(6, 1)).toThrow(RangeError);
  });
});