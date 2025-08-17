import { createHash } from 'crypto';
import { z } from 'zod';

export function computeCardHash(token: string, bizSalt: string): string {
  const hash = createHash('sha256');
  hash.update(`${bizSalt}:${token}`);
  return hash.digest('hex');
}

export const RedemptionEventSchema = z.object({
  bizId: z.string(),
  amount: z.number().nonnegative(),
  cardToken: z.string().optional(),
  deviceHash: z.string().optional(),
  ip: z.string().optional(),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  timestamp: z.string(),
});

export async function evaluateRedemption(event: z.infer<typeof RedemptionEventSchema>): Promise<{ action: 'allow' | 'review' | 'block'; reasons: string[] }> {
  const reasons: string[] = [];

  // Block non-positive amounts
  if (event.amount <= 0) {
    return { action: 'block', reasons: ['non_positive_amount'] };
  }

  // Flag missing data for review
  if (!event.cardToken) {
    reasons.push('missing_card_token');
  }
  if (!event.deviceHash) {
    reasons.push('missing_device_hash');
  }
  if (!event.ip) {
    reasons.push('missing_ip');
  }
  if (!event.geo) {
    reasons.push('missing_geo');
  }

  // TODO: Add velocity checks, blacklist checks, and geo fence validation
  // These would query Firestore for historical data and business settings

  const action: 'allow' | 'review' | 'block' = reasons.length ? 'review' : 'allow';
  return { action, reasons };
} 