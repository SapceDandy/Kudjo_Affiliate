import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const BodySchema = z.object({
  idToken: z.string().min(10),
});

const SESSION_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function handleSessionLogin(req: Request, res: Response): Promise<void> {
  const body = BodySchema.parse(req.body);

  const decoded = await admin.auth().verifyIdToken(body.idToken);
  const sessionCookie = await admin.auth().createSessionCookie(body.idToken, {
    expiresIn: SESSION_EXPIRES_IN_MS,
  });

  res.cookie('__session', sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRES_IN_MS,
    path: '/',
  });

  res.status(200).json({ ok: true, uid: decoded.uid });
}
