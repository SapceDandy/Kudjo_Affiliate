import { Request, Response } from 'express';
import admin from 'firebase-admin';

type MetricsData = {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenueCents: number;
  generatedAt: string;
};

let cache: { data: MetricsData; timestamp: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function handleControlCenterMetrics(req: Request, res: Response): Promise<void> {
  const refresh = String(req.query.refresh || '') === 'true';
  const now = Date.now();

  if (!refresh && cache && now - cache.timestamp < CACHE_MS) {
    res.status(200).json({ ...cache.data, fromCache: true });
    return;
  }

  const db = admin.firestore();

  const [businessesSnapshot, influencersSnapshot, couponsSnapshot, redemptionsSnapshot] = await Promise.all([
    db.collection('businesses').get(),
    db.collection('influencers').get(),
    db.collection('coupons').get(),
    db.collection('redemptions').get(),
  ]);

  const activeCoupons = couponsSnapshot.docs.filter((doc) => (doc.data() as any)?.status === 'active').length;

  let totalRevenueCents = 0;
  redemptionsSnapshot.docs.forEach((doc) => {
    const data: any = doc.data();
    totalRevenueCents += data?.orderValueCents || 0;
  });

  const metrics: MetricsData = {
    totalUsers: businessesSnapshot.size + influencersSnapshot.size,
    totalBusinesses: businessesSnapshot.size,
    totalInfluencers: influencersSnapshot.size,
    totalCoupons: couponsSnapshot.size,
    activeCoupons,
    totalRedemptions: redemptionsSnapshot.size,
    totalRevenueCents,
    generatedAt: new Date().toISOString(),
  };

  cache = { data: metrics, timestamp: now };
  res.status(200).json(metrics);
}
