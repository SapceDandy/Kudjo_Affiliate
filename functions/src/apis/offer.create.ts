import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import { getPosAdapter } from '../integrations/posAdapter';

const OfferCreateSchema = z.object({
  bizId: z.string().min(1, 'Business ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  splitPct: z.number().min(1, 'Split percentage must be at least 1%').max(100, 'Split percentage cannot exceed 100%'),
  minSpend: z.number().min(0, 'Minimum spend cannot be negative').optional(),
  blackout: z.array(z.string()).optional(),
  startAt: z.string().datetime('Invalid start date format'),
  endAt: z.string().datetime('Invalid end date format').optional(),
  syncToPos: z.boolean().optional(),
});

export async function handleOfferCreate(req: Request, res: Response) {
  try {
    const validatedData = OfferCreateSchema.parse(req.body);
    const { bizId, title, description, splitPct, minSpend, blackout, startAt, endAt } = validatedData;
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
      const syncToPos = Boolean(validatedData.syncToPos);
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: error.flatten() 
      });
    }
    
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
}