import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { getPosAdapter } from '../integrations/posAdapter';

export async function handleOfferCreate(req: Request, res: Response) {
  const { bizId, title, description, splitPct, minSpend, blackout, startAt, endAt } = req.body as any;
  const ref = await admin.firestore().collection('offers').add({
    bizId,
    title,
    description: description || null,
    splitPct,
    publicCode: title.toUpperCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000),
    minSpend: minSpend ?? null,
    blackout: blackout ?? [],
    startAt,
    endAt: endAt || null,
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  // Attempt POS sync if provider configured
  try {
    const bizSnap = await admin.firestore().doc(`businesses/${bizId}`).get();
    const provider = (bizSnap.get('posProvider') || 'manual') as any;
    const syncToPos = Boolean((req.body as any).syncToPos);
    if (syncToPos && provider && provider !== 'manual') {
      const adapter = getPosAdapter({ provider });
      const result = await adapter.createPromotion({
        businessId: bizId,
        dealId: ref.id,
        title,
        percentage: Number(splitPct || 0),
        startAt,
        endAt,
      });
      await ref.update({ posExternalId: result.externalId });
    }
  } catch (e) {
    await ref.update({ posSyncError: String((e as Error).message || e) });
  }

  res.json({ offerId: ref.id });
}