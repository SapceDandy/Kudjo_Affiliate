import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handlePayoutSummary(req: Request, res: Response): Promise<void> {
  const { influencerId, start, end } = req.query as any;
  if (!influencerId || !start || !end) {
    res.status(400).json({ error: 'validation_error' });
    return;
  }
  const db = admin.firestore();
  const snap = await db.collection('redemptions')
    .where('infId', '==', influencerId)
    .where('status', '==', 'payable')
    .get();

  let total = 0;
  snap.docs.forEach((d) => {
    const amount = d.get('discount_cents') || 0;
    total += amount;
  });

  res.json({ influencerId, period: { start, end }, total_payable_cents: total });
}


