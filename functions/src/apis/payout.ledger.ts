import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import { payoutSystem } from '../payout/payout-system';

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

const ledgerQuerySchema = z.object({
  influencerId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(['earning', 'payout', 'adjustment', 'fee', 'refund']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function handlePayoutLedger(req: Request, res: Response): Promise<void> {
  const user = (req as any).user as { uid: string; role: string } | undefined;
  const parsed = ledgerQuerySchema.parse(req.query as any);
  const influencerId = parsed.influencerId || user?.uid;
  if (!influencerId) {
    res.status(400).json({ error: 'validation_error' });
    return;
  }

  if (user?.role === 'influencer' && influencerId !== user.uid) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const db = admin.firestore();
  let query: FirebaseFirestore.Query = db.collection('ledgerEntries').where('influencerId', '==', influencerId);

  if (parsed.type) {
    query = query.where('type', '==', parsed.type);
  }
  if (parsed.startDate) {
    query = query.where('transactionDate', '>=', new Date(parsed.startDate));
  }
  if (parsed.endDate) {
    query = query.where('transactionDate', '<=', new Date(parsed.endDate));
  }

  const snapshot = await query.orderBy('transactionDate', 'desc').limit(parsed.limit).offset(parsed.offset).get();
  const entries = snapshot.docs.map((doc) => {
    const d = doc.data() as any;
    const transactionDate = d.transactionDate?.toDate?.() || d.transactionDate;
    const createdAt = d.createdAt?.toDate?.() || d.createdAt;
    return {
      id: doc.id,
      ...d,
      transactionDate: transactionDate ? new Date(transactionDate).toISOString() : null,
      createdAt: createdAt ? new Date(createdAt).toISOString() : null,
    };
  });

  const balance = await payoutSystem.calculateInfluencerBalance(influencerId);

  res.json({
    influencerId,
    entries,
    balance,
    pagination: {
      limit: parsed.limit,
      offset: parsed.offset,
      hasMore: entries.length === parsed.limit,
    },
  });
}


