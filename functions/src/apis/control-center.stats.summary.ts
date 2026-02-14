import { Request, Response } from 'express';
import admin from 'firebase-admin';

type SummaryStats = {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  totalRedemptions: number;
  totalPayouts: number;
  totalRevenueCents: number;
  generatedAt: string;
};

let cache: { data: SummaryStats; timestamp: number } | null = null;
const CACHE_MS = 30 * 1000;

export async function handleControlCenterStatsSummary(req: Request, res: Response): Promise<void> {
  const refresh = String(req.query.refresh || '') === 'true';
  const now = Date.now();

  if (!refresh && cache && now - cache.timestamp < CACHE_MS) {
    res.set('Cache-Control', 'private, max-age=30');
    res.status(200).json({ ...cache.data, fromCache: true });
    return;
  }

  const db = admin.firestore();

  const [businessesSnap, influencersSnap, couponsSnap, redemptionsSnap, payoutsSnap] = await Promise.all([
    db.collection('businesses').get(),
    db.collection('influencers').get(),
    db.collection('coupons').get(),
    db.collection('redemptions').get(),
    db.collection('payouts').get(),
  ]);

  let totalRevenueCents = 0;
  redemptionsSnap.docs.forEach((doc) => {
    const d: any = doc.data();
    totalRevenueCents += Number(d?.orderValueCents || 0);
  });

  const data: SummaryStats = {
    totalUsers: businessesSnap.size + influencersSnap.size,
    totalBusinesses: businessesSnap.size,
    totalInfluencers: influencersSnap.size,
    totalCoupons: couponsSnap.size,
    totalRedemptions: redemptionsSnap.size,
    totalPayouts: payoutsSnap.size,
    totalRevenueCents,
    generatedAt: new Date().toISOString(),
  };

  cache = { data, timestamp: now };
  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json(data);
}
