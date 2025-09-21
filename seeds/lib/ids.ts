import { v5 as uuidv5 } from "uuid";

// Fixed namespace UUID for deterministic seeding - NEVER CHANGE THIS
export const KUDJO_SEED_NS = "b7c7a2b4-6cf9-5a3b-8e0d-3e4fd5a4c7b1";

export function detId(kind: "merchant"|"user"|"affiliate"|"coupon"|"campaign"|"business"|"influencer"|"link"|"redemption"|"payout"|"conversation"|"message"|"audit", ...parts: Array<string|number>) {
  const name = `${kind}:${parts.map(String).join("|")}`;
  return uuidv5(name, KUDJO_SEED_NS);
}

// Nice short codes for coupons (deterministic but readable)
export function shortCode(seed: string, len = 6) {
  return uuidv5(seed, KUDJO_SEED_NS).replace(/-/g, "").slice(0, len).toUpperCase();
}

// Helper to generate stable timestamps for testing
export function detTimestamp(seed: string, baseDate = "2025-01-01T00:00:00Z"): Date {
  const hash = uuidv5(seed, KUDJO_SEED_NS).replace(/-/g, "");
  const offset = parseInt(hash.slice(0, 8), 16) % (30 * 24 * 60 * 60 * 1000); // 30 days in ms
  return new Date(new Date(baseDate).getTime() + offset);
}

// Examples:
// const merchantId = detId("merchant", "Pasta Palace", "Austin", "v1");
// const userId = detId("user", "+15555550123");
// const couponId = detId("coupon", merchantId, userId, "smoke01", "1");
// const code = shortCode(`${couponId}:WELCOME`);
