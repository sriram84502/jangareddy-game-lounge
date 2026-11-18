export const SESSION_DURATIONS = [1, 2, 3] as const;
export type SessionDuration = (typeof SESSION_DURATIONS)[number];

export const GROUP_SIZES = [1, 2, 3, 4, 5] as const;
export type PartySize = (typeof GROUP_SIZES)[number];

export const GROUP_SESSION_PRICES: Record<number, Record<SessionDuration, number>> = {
  1: { 1: 100, 2: 180, 3: 250 },
  2: { 1: 150, 2: 270, 3: 375 },
  3: { 1: 200, 2: 360, 3: 500 },
  4: { 1: 250, 2: 450, 3: 625 },
  5: { 1: 300, 2: 540, 3: 750 },
};

export function calculateSessionPrice(partySize: number, durationHours: SessionDuration) {
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 5) {
    throw new RangeError("Session pricing is available for groups of 1 to 5 people");
  }

  const price = GROUP_SESSION_PRICES[partySize]?.[durationHours];
  if (price === undefined) {
    throw new RangeError("No session price is configured for this group");
  }

  return price;
}
