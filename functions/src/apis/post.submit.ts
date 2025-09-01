import { Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';

const postSubmitSchema = z.object({
  influencerId: z.string().min(1),
  offerId: z.string().min(1),
  postUrl: z.string().url(),
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  screenshot: z.string().optional()
});

export async function handlePostSubmit(req: Request, res: Response): Promise<void> {
  try {
    const { influencerId, offerId, postUrl, platform, screenshot } = postSubmitSchema.parse(req.body);
    
    const db = admin.firestore();
    
    // Create content submission record
    const submission = await db.collection('contentSubmissions').add({
      influencerId,
      offerId,
      postUrl,
      platform,
      screenshot,
      status: 'pending_review',
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
      isLive: null,
      nextCheckAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    res.status(200).json({
      submissionId: submission.id,
      status: 'pending_review',
      nextCheckAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('Error submitting post:', error);
    res.status(400).json({ error: 'Invalid submission data' });
  }
}
