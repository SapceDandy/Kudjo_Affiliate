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
  businessId: z.string().optional(),
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

export async function handleAnalyticsTierMix(req: Request, res: Response): Promise<void> {
  const auth = requireAnyRole(req, res, ['admin', 'business']);
  if (!auth) return;

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
    return;
  }

  const { period, businessId } = parsed.data;

  const endDate = new Date();
  const startDate = startDateForPeriod(period);

  const db = admin.firestore();

  let redemptionsQuery: FirebaseFirestore.Query = db
    .collection('redemptions')
    .where('redeemedAt', '>=', startDate)
    .where('redeemedAt', '<=', endDate);

  if (businessId) redemptionsQuery = redemptionsQuery.where('businessId', '==', businessId);

  const redemptionsSnapshot = await redemptionsQuery.get();

  const influencerIds = new Set<string>();
  redemptionsSnapshot.docs.forEach((doc) => {
    const d: any = doc.data();
    if (d?.influencerId) influencerIds.add(String(d.influencerId));
  });

  const tierLabels: Record<string, string> = {
    S: 'Nano (1K-10K)',
    M: 'Micro (10K-100K)',
    L: 'Macro (100K-1M)',
    XL: 'Mega (1M+)',
    Huge: 'Celebrity (10M+)',
  };

  const tierCounts = new Map<string, { count: number; revenue: number; conversions: number }>();
  Object.keys(tierLabels).forEach((t) => tierCounts.set(t, { count: 0, revenue: 0, conversions: 0 }));

  const influencerIdsArray = Array.from(influencerIds);
  for (let i = 0; i < influencerIdsArray.length; i += 30) {
    const batch = influencerIdsArray.slice(i, i + 30);
    const influencersSnapshot = await db.collection('influencers').where('__name__', 'in', batch).get();

    influencersSnapshot.docs.forEach((doc) => {
      const influencer: any = doc.data();
      const tier = String(influencer?.tier || 'S');
      const influencerId = doc.id;
      if (!tierCounts.has(tier)) tierCounts.set(tier, { count: 0, revenue: 0, conversions: 0 });

      const tierData = tierCounts.get(tier)!;
      tierData.count += 1;

      redemptionsSnapshot.docs.forEach((rDoc) => {
        const redemption: any = rDoc.data();
        if (redemption?.influencerId === influencerId) {
          tierData.revenue += Number(redemption?.amountCents || 0);
          tierData.conversions += 1;
        }
      });
    });
  }

  const total = influencerIds.size;
  const tierMix = Array.from(tierCounts.entries())
    .map(([tier, data]) => ({
      tier,
      label: tierLabels[tier] || tier,
      count: data.count,
      revenue: data.revenue / 100,
      conversions: data.conversions,
      percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
    }))
    .filter((i) => i.count > 0);

  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json({ tierMix, totalActiveInfluencers: total });
}
