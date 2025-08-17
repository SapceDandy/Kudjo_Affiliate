import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { exchangeSquareCode, storeSquareTokenForBiz } from '../integrations/square/oauth';

export async function handleBusinessPosConnect(req: Request, res: Response): Promise<void> {
  const { bizId, provider, code, credentials } = req.body as any;
  const ref = admin.firestore().doc(`businesses/${bizId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  let posStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  if (provider === 'square' && code) {
    const redirectUri = `${process.env.PUBLIC_URL || 'https://example.com'}/business/settings`;
    const token = await exchangeSquareCode(code, redirectUri);
    await storeSquareTokenForBiz(bizId, token);
    await ref.update({ posProvider: 'square', posStatus: 'connected' });
    posStatus = 'connected';
  } else if (provider === 'manual') {
    await ref.update({ posProvider: 'manual', posStatus: 'connected', manual: { credentials: !!credentials } });
    posStatus = 'connected';
  } else if (provider === 'clover') {
    await ref.update({ posProvider: 'clover', posStatus: 'disconnected' });
    posStatus = 'disconnected';
  }

  res.json({ posStatus });
} 