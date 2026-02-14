import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handleControlCenterUsersSeed(_req: Request, res: Response): Promise<void> {
  const db = admin.firestore();
  const auth = admin.auth();

  const businessUserId = 'demo_business_user';
  const influencerUserId = 'demo_influencer_user';
  const businessId = businessUserId;
  const influencerId = influencerUserId;

  const businessEmail = 'demo.business@example.com';
  const influencerEmail = 'demo.influencer@example.com';
  const demoPassword = 'demo123';

  // Create Auth users if they don't exist
  try {
    await auth.createUser({ uid: businessUserId, email: businessEmail, password: demoPassword, displayName: 'Demo Business' });
  } catch (e: any) {
    if (e?.code !== 'auth/uid-already-exists' && e?.code !== 'auth/email-already-exists') {
      throw e;
    }
  }

  try {
    await auth.createUser({ uid: influencerUserId, email: influencerEmail, password: demoPassword, displayName: 'Demo Influencer' });
  } catch (e: any) {
    if (e?.code !== 'auth/uid-already-exists' && e?.code !== 'auth/email-already-exists') {
      throw e;
    }
  }

  const nowIso = new Date().toISOString();

  await db.collection('users').doc(businessUserId).set(
    {
      id: businessUserId,
      email: businessEmail,
      role: 'business',
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await db.collection('businesses').doc(businessId).set(
    {
      id: businessId,
      ownerId: businessUserId,
      name: 'Demo Bistro',
      approved: false,
      approvalStatus: 'pending',
      approvalHistory: [],
      address: '123 Demo St, Hometown',
      geo: { lat: 37.7749, lng: -122.4194 },
      couponSettings: {
        defaultDiscountPct: 20,
        tierSplits: { Bronze: 10, Silver: 15, Gold: 20, Platinum: 25 },
        maxActiveInfluencers: 5,
        couponLimit: 100,
      },
      defaultSplitPct: 20,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await db.collection('users').doc(influencerUserId).set(
    {
      id: influencerUserId,
      email: influencerEmail,
      role: 'influencer',
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await db.collection('influencers').doc(influencerId).set(
    {
      id: influencerId,
      ownerId: influencerUserId,
      handle: '@demo_influencer',
      approved: false,
      approvalStatus: 'pending',
      approvalHistory: [],
      followers: 15000,
      tier: 'Silver',
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  await db.collection('offers').doc('demo_offer').set(
    {
      id: 'demo_offer',
      bizId: businessId,
      title: '20% Off Any Entree',
      description: 'Enjoy 20% off your meal at Demo Bistro',
      splitPct: 20,
      active: true,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  res.status(200).json({
    success: true,
    businessUserId,
    influencerUserId,
    businessId,
    influencerId,
    credentials: { businessEmail, influencerEmail, password: demoPassword },
  });
}
