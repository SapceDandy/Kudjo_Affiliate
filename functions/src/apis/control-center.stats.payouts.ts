import { Request, Response } from 'express';
import admin from 'firebase-admin';

type PayoutsStats = {
  totalPayouts: number;
  totalAmountCents: number;
  byStatus: Record<string, number>;
  generatedAt: string;
};

let cache: { data: PayoutsStats; timestamp: number } | null = null;
const CACHE_MS = 30 * 1000;

export async function handleControlCenterStatsPayouts(req: Request, res: Response): Promise<void> {
  const refresh = String(req.query.refresh || '') === 'true';
  const now = Date.now();

  if (!refresh && cache && now - cache.timestamp < CACHE_MS) {
    res.set('Cache-Control', 'private, max-age=30');
    res.status(200).json({ ...cache.data, fromCache: true });
    return;
  }

  const db = admin.firestore();
  const snap = await db.collection('payouts').get();

  let totalAmountCents = 0;
  const byStatus: Record<string, number> = {};

  snap.docs.forEach((doc) => {
    const d: any = doc.data();
    const status = String(d?.status || 'unknown');
    byStatus[status] = (byStatus[status] || 0) + 1;
    totalAmountCents += Number(d?.amountCents || 0);
  });

  const data: PayoutsStats = {
    totalPayouts: snap.size,
    totalAmountCents,
    byStatus,
    generatedAt: new Date().toISOString(),
  };

  cache = { data, timestamp: now };
  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json(data);
}
