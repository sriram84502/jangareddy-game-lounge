export const SESSION_PRICES: Record<1 | 2 | 3, number> = {
  1: 100,
  2: 180,
  3: 250,
};

export function calculateSessionPrice(partySize: number, durationHours: 1 | 2 | 3) {
  return SESSION_PRICES[durationHours] * partySize;
}