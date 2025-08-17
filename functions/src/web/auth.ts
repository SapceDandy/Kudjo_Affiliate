import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

let initialized = false;
function ensureInit() {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
  }
}

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  ensureInit();
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    const role = (decoded as any).role || 'influencer';
    (req as any).user = { uid: decoded.uid, role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
} 