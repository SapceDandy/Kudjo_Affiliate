import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

type Role = 'admin' | 'business' | 'influencer';
function requireAnyRole(req: Request, res: Response, allowed: Role[]): { uid: string; role: Role } | null {
  const user = (req as any).user as { uid: string; role: Role } | undefined;
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' });
    return null;
  }
  if (!allowed.includes(user.role) && user.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  return user;
}

const querySchema = z.object({
  metric: z.enum(['revenue', 'payout', 'conversions']).default('revenue'),
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  limit: z.coerce.number().min(1).max(50).default(10),
});

function startDateForPeriod(period: string): Date {
  const endDate = new Date();
  const startDate = new Date();
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }
  return startDate;
}

export async function handleAnalyticsTopBusinesses(req: Request, res: Response): Promise<void> {
  const auth = requireAnyRole(req, res, ['admin', 'business']);
  if (!auth) return;

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
    return;
  }

  const { metric, period, limit } = parsed.data;

  const endDate = new Date();
  const startDate = startDateForPeriod(period);

  const db = admin.firestore();
  const redemptionsSnapshot = await db
    .collection('redemptions')
    .where('redeemedAt', '>=', startDate)
    .where('redeemedAt', '<=', endDate)
    .get();

  const businessMetrics = new Map<
    string,
    { businessId: string; businessName: string; revenue: number; payout: number; conversions: number }
  >();

  for (const doc of redemptionsSnapshot.docs) {
    const redemption: any = doc.data();
    const businessId = redemption?.businessId;
    if (!businessId) continue;

    if (!businessMetrics.has(businessId)) {
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      const bd: any = businessDoc.data();
      const businessName = businessDoc.exists ? bd?.name || bd?.businessName || 'Unknown Business' : 'Unknown Business';

      businessMetrics.set(businessId, {
        businessId,
        businessName,
        revenue: 0,
        payout: 0,
        conversions: 0,
      });
    }

    const m = businessMetrics.get(businessId)!;
    const amount = Number(redemption?.amountCents || 0);
    const splitPct = Number(redemption?.splitPct || 20);
    const influencerPayout = Math.round(amount * (splitPct / 100));

    m.revenue += amount;
    m.payout += influencerPayout;
    m.conversions += 1;
  }

  const businesses = Array.from(businessMetrics.values())
    .sort((a, b) => {
      if (metric === 'payout') return b.payout - a.payout;
      if (metric === 'conversions') return b.conversions - a.conversions;
      return b.revenue - a.revenue;
    })
    .slice(0, limit)
    .map((b) => ({
      ...b,
      revenue: b.revenue / 100,
      payout: b.payout / 100,
    }));

  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json({ businesses, metric, period });
}
