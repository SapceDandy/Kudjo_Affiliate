import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handleOfferSuggest(req: Request, res: Response) {
  const { bizId, infId } = req.query as any;
  if (!bizId || !infId) return res.status(400).json({ error: 'missing_params' });
  const db = admin.firestore();
  // Fetch existing offers for business
  const offersSnap = await db.collection('offers').where('bizId', '==', bizId).get();
  const existingTitles = new Set<string>(offersSnap.docs.map(d => (d.get('title') || '').toLowerCase()));
  // Simple suggestion set
  const candidates = [
    '10% Off Any Entree',
    'Buy One Get One 50% Off',
    'Free Appetizer with Meal',
    '20% Off Lunch Special',
    '15% Off for First-Time Customers'
  ];
  const suggestions = candidates.filter(c => !existingTitles.has(c.toLowerCase()));
  res.json({ suggestions });
}



