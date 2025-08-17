import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handleEarningsSummary(req: Request, res: Response) {
  const infId = (req.query.infId as string) || (req as any).user.uid;
  const snaps = await admin.firestore().collection('redemptions').where('infId', '==', infId).get();
  let total = 0;
  const perBiz: Record<string, number> = {};
  snaps.forEach((d) => {
    const amt = d.get('netRevenue') * (d.get('splitPct') || 0) / 100;
    total += amt;
    const bizId = d.get('bizId');
    perBiz[bizId] = (perBiz[bizId] || 0) + amt;
  });
  res.json({ total, perBiz });
} 