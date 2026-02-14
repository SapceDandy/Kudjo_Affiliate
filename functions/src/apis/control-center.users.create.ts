import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const BodySchema = z.object({
  role: z.enum(['business', 'influencer']),
  email: z.string().email(),
  displayName: z.string().optional(),
  businessName: z.string().optional(),
  website: z.string().optional(),
  influencerName: z.string().optional(),
  pages: z.array(z.string()).optional(),
  password: z.string().min(6).optional(),
});

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

export async function handleControlCenterUsersCreate(req: Request, res: Response): Promise<void> {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
    return;
  }

  const { role, email, displayName, businessName, website, influencerName, pages, password } = parsed.data;

  if (role === 'business' && (!businessName || !website)) {
    res.status(400).json({ error: 'validation_error', message: 'Business name and website required' });
    return;
  }

  if (role === 'influencer' && (!influencerName || !pages || pages.length === 0)) {
    res.status(400).json({ error: 'validation_error', message: 'Influencer name and pages required' });
    return;
  }

  const auth = admin.auth();
  const db = admin.firestore();

  const effectivePassword = typeof password === 'string' && password.length >= 6 ? password : generatePassword(12);

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password: effectivePassword,
      displayName: displayName || email,
    });
  } catch (e: any) {
    if (e?.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(email);
    } else {
      throw e;
    }
  }

  const uid = userRecord.uid;
  const nowIso = new Date().toISOString();

  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        id: uid,
        email,
        displayName: displayName || userRecord.displayName || email,
        role,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

  if (role === 'business') {
    await db
      .collection('businesses')
      .doc(uid)
      .set(
        {
          id: uid,
          ownerId: uid,
          name: businessName,
          website,
          status: 'active',
          approved: false,
          approvalStatus: 'pending',
          approvalHistory: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
  }

  if (role === 'influencer') {
    await db
      .collection('influencers')
      .doc(uid)
      .set(
        {
          id: uid,
          ownerId: uid,
          handle: influencerName,
          pages,
          approved: false,
          approvalStatus: 'pending',
          approvalHistory: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
  }

  const response: any = { success: true, id: uid, email };
  if (!password) response.generatedPassword = effectivePassword;

  res.status(200).json(response);
}
