import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  businessId: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

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

export async function handleAnalyticsRoas(req: Request, res: Response): Promise<void> {
  const auth = requireAnyRole(req, res, ['admin', 'business']);
  if (!auth) return;

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
    return;
  }

  const { period, businessId, granularity } = parsed.data;

  const endDate = new Date();
  const startDate = startDateForPeriod(period);

  const db = admin.firestore();

  let redemptionsQuery: FirebaseFirestore.Query = db
    .collection('redemptions')
    .where('redeemedAt', '>=', startDate)
    .where('redeemedAt', '<=', endDate);

  if (businessId) {
    redemptionsQuery = redemptionsQuery.where('businessId', '==', businessId);
  }

  const [redemptionsSnapshot, offersSnapshot] = await Promise.all([
    redemptionsQuery.get(),
    businessId ? db.collection('offers').where('bizId', '==', businessId).get() : db.collection('offers').get(),
  ]);

  let totalSpend = 0;
  offersSnapshot.docs.forEach((doc) => {
    const offer: any = doc.data();
    totalSpend += Number(offer?.budgetCents || 0);
  });

  const groups = new Map<
    string,
    { date: string; revenue: number; adSpend: number; conversions: number; roas: number }
  >();

  redemptionsSnapshot.docs.forEach((doc) => {
    const d: any = doc.data();
    const redeemedAt: Date = d?.redeemedAt?.toDate?.() || new Date(d?.redeemedAt || Date.now());
    const { key, label } = timeKey(redeemedAt, granularity);

    if (!groups.has(key)) {
      groups.set(key, { date: label, revenue: 0, adSpend: 0, conversions: 0, roas: 0 });
    }

    const g = groups.get(key)!;
    g.revenue += Number(d?.orderValueCents || 0);
    g.conversions += 1;
  });

  // naive spend allocation across groups
  const groupCount = Math.max(1, groups.size);
  groups.forEach((g) => {
    g.adSpend = totalSpend / groupCount;
    g.roas = g.adSpend > 0 ? g.revenue / g.adSpend : 0;
  });

  const roasData = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, g]) => ({
      date: g.date,
      revenue: Math.round((g.revenue / 100) * 100) / 100,
      adSpend: Math.round((g.adSpend / 100) * 100) / 100,
      conversions: g.conversions,
      roas: Math.round(g.roas * 100) / 100,
    }));

  const totalRevenue = roasData.reduce((sum, d) => sum + d.revenue, 0);
  const totalAdSpend = roasData.reduce((sum, d) => sum + d.adSpend, 0);
  const overallRoas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;

  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json({
    roasData,
    summary: {
      totalRevenue,
      totalAdSpend,
      overallRoas: Math.round(overallRoas * 100) / 100,
    },
  });
}
