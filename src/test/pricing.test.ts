import { describe, expect, it } from "vitest";

import { calculateSessionPrice } from "@/lib/pricing";

describe("group session pricing", () => {
  it.each([
    { people: 1, hours: 1, total: 100 }, { people: 1, hours: 2, total: 180 }, { people: 1, hours: 3, total: 250 },
    { people: 2, hours: 1, total: 150 }, { people: 2, hours: 2, total: 270 }, { people: 2, hours: 3, total: 375 },
    { people: 3, hours: 1, total: 200 }, { people: 3, hours: 2, total: 360 }, { people: 3, hours: 3, total: 500 },
    { people: 4, hours: 1, total: 250 }, { people: 4, hours: 2, total: 450 }, { people: 4, hours: 3, total: 625 },
    { people: 5, hours: 1, total: 300 }, { people: 5, hours: 2, total: 540 }, { people: 5, hours: 3, total: 750 },
  ])("charges ₹$total total for $people people for $hours hour(s)", ({ people, hours, total }) => {
    expect(calculateSessionPrice(people, hours)).toBe(total);
  });

  it("rejects group sizes without an approved rate", () => {
    expect(() => calculateSessionPrice(6, 1)).toThrow(RangeError);
  });
});