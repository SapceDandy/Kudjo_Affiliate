import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const UpdatesSchema = z
  .object({
    status: z.enum(['active', 'pending', 'suspended']).optional(),
    displayName: z.string().min(1).max(200).optional(),
  })
  .strict();

const BodySchema = z.object({
  id: z.string().min(1),
  updates: UpdatesSchema,
});

export async function handleControlCenterUsersUpdate(req: Request, res: Response): Promise<void> {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
    return;
  }

  const { id, updates } = parsed.data;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'validation_error', message: 'No updates provided' });
    return;
  }
  const db = admin.firestore();

  await db
    .collection('users')
    .doc(id)
    .set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });

  res.status(200).json({ success: true });
}
