import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handleOfferCreate(req: Request, res: Response) {
  const { bizId, title, description, splitPct, minSpend, blackout, startAt, endAt } = req.body as any;
  const doc = await admin.firestore().collection('offers').add({
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
  });
  res.json({ offerId: doc.id });
} 