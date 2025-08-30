import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type Tier = 'Small' | 'Medium' | 'Large' | 'XL' | 'Huge';
function tierForFollowers(count: number): Tier {
  if (count < 20000) return 'Small';
  if (count < 100000) return 'Medium';
  if (count < 500000) return 'Large';
  if (count < 1000000) return 'XL';
  return 'Huge';
}

async function initAdmin() {
  if (admin.apps.length) return;
  // Try env creds first
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    return;
  }

  // Then try local service account files
  const __filename = fileURLToPath(import.meta.url);
  const __dirnameLocal = path.dirname(__filename);
  const candidates = [
    path.resolve(__dirnameLocal, 'firebase-service-account.json'),
    path.resolve(process.cwd(), 'scripts/firebase-service-account.json'),
    path.resolve(process.cwd(), 'service-account.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const sa = JSON.parse(fs.readFileSync(p, 'utf-8'));
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        return;
      }
    } catch {}
  }

  // Last resort: ADC
  admin.initializeApp();
}

async function seedMinimal() {
  await initAdmin();
  const db = admin.firestore();

  // Admin user (for audit only — admin login is env-based)
  await db.collection('users').doc('admin_user').set({
    id: 'admin_user',
    email: 'admin@kudjo.app',
    role: 'admin',
    createdAt: new Date().toISOString(),
    status: 'active',
  }, { merge: true });

  // Demo business
  const bizId = 'demo_biz_1';
  const bizName = 'Demo Bistro';
  await db.collection('businesses').doc(bizId).set({
    id: bizId,
    ownerId: 'demo_business_owner',
    name: bizName,
    address: '123 Congress Ave, Austin, TX',
    geo: { lat: 30.2672, lng: -97.7431 },
    posProvider: 'manual',
    posStatus: 'connected',
    defaultSplitPct: 20,
    status: 'active',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  // Demo influencers (Small and Large)
  const infSmallId = 'demo_inf_small';
  const infSmallFollowers = 15000;
  await db.collection('influencers').doc(infSmallId).set({
    id: infSmallId,
    ownerId: infSmallId,
    handle: '@demo_small',
    preferredGeo: { lat: 30.3, lng: -97.75 },
    followerCount: infSmallFollowers,
    tier: tierForFollowers(infSmallFollowers),
    approved: true,
    status: 'active',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  const infLargeId = 'demo_inf_large';
  const infLargeFollowers = 250000;
  await db.collection('influencers').doc(infLargeId).set({
    id: infLargeId,
    ownerId: infLargeId,
    handle: '@demo_large',
    preferredGeo: { lat: 30.24, lng: -97.7 },
    followerCount: infLargeFollowers,
    tier: tierForFollowers(infLargeFollowers),
    approved: true,
    status: 'active',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  // Demo deal (offer)
  const offerId = 'demo_offer_1';
  await db.collection('offers').doc(offerId).set({
    id: offerId,
    bizId,
    title: 'First Time Customer - 25% Off Any Entree',
    description: 'Enjoy 25% off your meal at Demo Bistro - perfect for new customers',
    splitPct: 20,
    userDiscountPct: 25,
    payoutPerRedemptionCents: 400, // $4 per redemption
    publicCode: 'DEMO25',
    startAt: new Date().toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  // One unified content coupon for the Small influencer
  const couponId = 'demo_coupon_1';
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.collection('coupons').doc(couponId).set({
    id: couponId,
    type: 'CONTENT_MEAL',
    bizId,
    infId: infSmallId,
    offerId,
    code: 'MEAL-DEMO-SMAL-ABC123',
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt,
  }, { merge: true });

  // One redemption record linked to the coupon
  const redemptionId = 'demo_redemption_1';
  await db.collection('redemptions').doc(redemptionId).set({
    id: redemptionId,
    couponId,
    bizId,
    infId: infSmallId,
    offerId,
    source: 'content_meal',
    amount_cents: 5000,
    discount_cents: 1000,
    currency: 'USD',
    createdAt: new Date().toISOString(),
    status: 'pending',
  }, { merge: true });

  // One affiliate link for Large influencer (with UTM params)
  const linkId = 'demo_aff_link_1';
  await db.collection('affiliateLinks').doc(linkId).set({
    bizId,
    infId: infLargeId,
    offerId,
    token: 'DEMOAFF01',
    utmSource: 'tiktok',
    utmMedium: 'influencer',
    utmCampaign: 'demo_offer',
    url: 'https://example.com/a/DEMOAFF01?utm_source=tiktok&utm_medium=influencer&utm_campaign=demo_offer',
    status: 'active',
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

seedMinimal()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('✅ Minimal seed created.');
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });



