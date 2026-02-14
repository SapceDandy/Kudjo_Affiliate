import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import crypto from 'crypto';

const BodySchema = z.object({
  email: z.string().email(),
  passcode: z.string().min(1),
});

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function handleControlCenterLogin(req: Request, res: Response): Promise<void> {
  const body = BodySchema.parse(req.body);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasscode = process.env.ADMIN_PASSCODE;

  if (!adminEmail || !adminPasscode) {
    res.status(500).json({ error: 'admin_auth_not_configured' });
    return;
  }

  const ok = timingSafeEqual(body.email, adminEmail) && timingSafeEqual(body.passcode, adminPasscode);
  if (!ok) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const uid = `admin:${adminEmail.toLowerCase()}`;
  const customToken = await admin.auth().createCustomToken(uid, { role: 'admin', admin: true });

  res.status(200).json({ ok: true, customToken });
}
