import { Request, Response } from 'express';
import admin from 'firebase-admin';

type FunnelStats = {
  pendingInfluencers: number;
  approvedInfluencers: number;
  rejectedInfluencers: number;
  pendingBusinesses: number;
  approvedBusinesses: number;
  rejectedBusinesses: number;
  generatedAt: string;
};

let cache: { data: FunnelStats; timestamp: number } | null = null;
const CACHE_MS = 30 * 1000;

export async function handleControlCenterStatsFunnel(req: Request, res: Response): Promise<void> {
  const refresh = String(req.query.refresh || '') === 'true';
  const now = Date.now();

  if (!refresh && cache && now - cache.timestamp < CACHE_MS) {
    res.set('Cache-Control', 'private, max-age=30');
    res.status(200).json({ ...cache.data, fromCache: true });
    return;
  }

  const db = admin.firestore();

  const [infPending, infApproved, infRejected, bizPending, bizApproved, bizRejected] = await Promise.all([
    db.collection('influencers').where('status', '==', 'pending').get().then((s) => s.size),
    db.collection('influencers').where('status', '==', 'approved').get().then((s) => s.size),
    db.collection('influencers').where('status', '==', 'rejected').get().then((s) => s.size),
    db.collection('businesses').where('status', '==', 'pending').get().then((s) => s.size),
    db.collection('businesses').where('status', '==', 'approved').get().then((s) => s.size),
    db.collection('businesses').where('status', '==', 'rejected').get().then((s) => s.size),
  ]);

  const data: FunnelStats = {
    pendingInfluencers: infPending,
    approvedInfluencers: infApproved,
    rejectedInfluencers: infRejected,
    pendingBusinesses: bizPending,
    approvedBusinesses: bizApproved,
    rejectedBusinesses: bizRejected,
    generatedAt: new Date().toISOString(),
  };

  cache = { data, timestamp: now };
  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json(data);
}
