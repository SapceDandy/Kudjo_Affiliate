import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handleOutreachSend(req: Request, res: Response): Promise<void> {
  const { campaignId } = req.body as any;
  const campRef = admin.firestore().doc(`admin/outreachCampaigns/${campaignId}`);
  const camp = await campRef.get();
  if (!camp.exists) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const recipients = await campRef.collection('recipients').where('state', '==', 'queued').get();
  const batch = admin.firestore().batch();
  recipients.docs.slice(0, 50).forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
    batch.update(d.ref, { state: 'sent', lastEventAt: new Date().toISOString() });
  });
  await batch.commit();
  res.json({ queued: recipients.size });
} 