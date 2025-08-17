import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handleBusinessCreate(req: Request, res: Response) {
  const { name, address, posProvider, defaultSplitPct, geo } = req.body as any;
  const uid = (req as any).user.uid as string;
  const doc = await admin.firestore().collection('businesses').add({
    ownerUid: uid,
    name,
    address,
    geo: geo || null,
    posProvider,
    posStatus: 'disconnected',
    defaultSplitPct,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
  res.json({ bizId: doc.id });
} 