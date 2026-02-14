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
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  influencerId: z.string().optional(),
  businessId: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
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

function timeKey(date: Date, granularity: string): { key: string; label: string } {
  if (granularity === 'weekly') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const k = weekStart.toISOString().split('T')[0];
    return { key: k, label: `Week of ${k}` };
  }
  if (granularity === 'monthly') {
    const k = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    return { key: k, label };
  }
  const k = date.toISOString().split('T')[0];
  return { key: k, label: k };
}

export async function handleAnalyticsEarningsOverTime(req: Request, res: Response): Promise<void> {
  const auth = requireAnyRole(req, res, ['admin', 'business', 'influencer']);
  if (!auth) return;

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
    return;
  }

  const { period, influencerId, businessId, granularity } = parsed.data;

  const endDate = new Date();
  const startDate = startDateForPeriod(period);

  const db = admin.firestore();

  let redemptionsQuery: FirebaseFirestore.Query = db
    .collection('redemptions')
    .where('redeemedAt', '>=', startDate)
    .where('redeemedAt', '<=', endDate);

  if (influencerId) redemptionsQuery = redemptionsQuery.where('influencerId', '==', influencerId);
  if (businessId) redemptionsQuery = redemptionsQuery.where('businessId', '==', businessId);

  const snap = await redemptionsQuery.get();

  const groups = new Map<string, { earnings: number; conversions: number; revenue: number; date: string }>();

  snap.docs.forEach((doc) => {
    const d: any = doc.data();
    const redeemedAt: Date = d?.redeemedAt?.toDate?.() || new Date(d?.redeemedAt || Date.now());
    const { key, label } = timeKey(redeemedAt, granularity);

    if (!groups.has(key)) {
      groups.set(key, { earnings: 0, conversions: 0, revenue: 0, date: label });
    }

    const g = groups.get(key)!;
    const amount = Number(d?.amountCents || 0);
    const splitPct = Number(d?.splitPct || 20);
    const influencerEarnings = Math.round(amount * (splitPct / 100));
    g.earnings += influencerEarnings;
    g.revenue += amount;
    g.conversions += 1;
  });

  const earningsData = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, g]) => ({
      date: g.date,
      earnings: Math.round((g.earnings / 100) * 100) / 100,
      revenue: Math.round((g.revenue / 100) * 100) / 100,
      conversions: g.conversions,
      averageEarningsPerConversion:
        g.conversions > 0 ? Math.round(((g.earnings / g.conversions) / 100) * 100) / 100 : 0,
    }));

  const totalEarnings = earningsData.reduce((sum, i) => sum + i.earnings, 0);
  const totalRevenue = earningsData.reduce((sum, i) => sum + i.revenue, 0);
  const totalConversions = earningsData.reduce((sum, i) => sum + i.conversions, 0);
  const averageEarningsPerConversion = totalConversions > 0 ? totalEarnings / totalConversions : 0;

  let growthRate = 0;
  if (earningsData.length >= 2) {
    const first = earningsData[0].earnings;
    const last = earningsData[earningsData.length - 1].earnings;
    if (first > 0) growthRate = ((last - first) / first) * 100;
  }

  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json({
    earningsData,
    summary: {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalConversions,
      averageEarningsPerConversion: Math.round(averageEarningsPerConversion * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
    },
  });
}
