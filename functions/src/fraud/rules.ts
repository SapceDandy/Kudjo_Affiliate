import { createHash } from 'crypto';
import { z } from 'zod';

export function computeCardHash(token: string, bizSalt: string): string {
  const hash = createHash('sha256');
  hash.update(`${bizSalt}:${token}`);
  return hash.digest('hex');
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

export async function evaluateRedemption(
  event: z.infer<typeof RedemptionEventSchema>,
  db?: FirebaseFirestore.Firestore
): Promise<{ action: 'allow' | 'review' | 'block'; reasons: string[] }> {
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

  // --- Firestore-backed checks (only if db provided) ---
  if (db) {
    // Velocity check: max 3 redemptions per cardHash per hour
    if (event.cardToken) {
      const cardHash = computeCardHash(event.cardToken, event.bizId);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      try {
        const recentRedemptions = await db.collection('redemptions')
          .where('cardHash', '==', cardHash)
          .where('createdAt', '>=', oneHourAgo.toISOString())
          .limit(4)
          .get();
        if (recentRedemptions.size >= 3) {
          return { action: 'block', reasons: [...reasons, 'velocity_card_exceeded'] };
        }
      } catch {
        // Index may not exist yet — skip velocity check
      }
    }

    // Blacklist check: query fraudFlags for blocked cards/devices
    if (event.cardToken) {
      try {
        const cardFlag = await db.collection('fraudFlags')
          .where('value', '==', event.cardToken)
          .where('type', '==', 'card')
          .where('active', '==', true)
          .limit(1)
          .get();
        if (!cardFlag.empty) {
          return { action: 'block', reasons: [...reasons, 'blacklisted_card'] };
        }
      } catch {
        // Collection may not exist yet
      }
    }

    if (event.deviceHash) {
      try {
        const deviceFlag = await db.collection('fraudFlags')
          .where('value', '==', event.deviceHash)
          .where('type', '==', 'device')
          .where('active', '==', true)
          .limit(1)
          .get();
        if (!deviceFlag.empty) {
          return { action: 'block', reasons: [...reasons, 'blacklisted_device'] };
        }
      } catch {
        // Collection may not exist yet
      }
    }

    // Geo fence check: distance > 50km from business = flag
    if (event.geo) {
      try {
        const bizDoc = await db.collection('businesses').doc(event.bizId).get();
        const bizData = bizDoc.data();
        if (bizData?.geo) {
          const distance = haversineKm(
            event.geo.lat, event.geo.lng,
            bizData.geo.lat, bizData.geo.lng
          );
          if (distance > 50) {
            reasons.push('geo_fence_exceeded');
          }
        }
      } catch {
        // Skip geo check on error
      }
    }
  }

  if (reasons.some(r => r === 'velocity_card_exceeded' || r === 'blacklisted_card' || r === 'blacklisted_device')) {
    return { action: 'block', reasons };
  }

  const action: 'allow' | 'review' | 'block' = reasons.length ? 'review' : 'allow';
  return { action, reasons };
}
