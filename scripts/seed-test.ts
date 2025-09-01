import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin for emulator
const app = initializeApp({
  projectId: 'kudjo-affiliate-test'
});

const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

async function seedTestData() {
  console.log('🌱 Seeding test data for emulator...');

  try {
    // 1. Create test users in Auth
    const adminUser = await auth.createUser({
      uid: 'test-admin-001',
      email: 'admin@kudjo.test',
      password: 'testpass123',
      displayName: 'Test Admin'
    });

    const businessUser1 = await auth.createUser({
      uid: 'test-business-001',
      email: 'business1@kudjo.test',
      password: 'testpass123',
      displayName: 'Manual POS Business'
    });

    const businessUser2 = await auth.createUser({
      uid: 'test-business-002',
      email: 'business2@kudjo.test',
      password: 'testpass123',
      displayName: 'Square POS Business'
    });

    const influencerUser1 = await auth.createUser({
      uid: 'test-influencer-001',
      email: 'influencer1@kudjo.test',
      password: 'testpass123',
      displayName: 'Small Tier Influencer'
    });

    const influencerUser2 = await auth.createUser({
      uid: 'test-influencer-002',
      email: 'influencer2@kudjo.test',
      password: 'testpass123',
      displayName: 'Medium Tier Influencer'
    });

    console.log('✅ Created test users in Auth');

    // 2. Create user documents
    await db.collection('users').doc('test-admin-001').set({
      email: 'admin@kudjo.test',
      role: 'admin',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    await db.collection('users').doc('test-business-001').set({
      email: 'business1@kudjo.test',
      role: 'business',
      businessId: 'test-business-001',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    await db.collection('users').doc('test-business-002').set({
      email: 'business2@kudjo.test',
      role: 'business',
      businessId: 'test-business-002',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    await db.collection('users').doc('test-influencer-001').set({
      email: 'influencer1@kudjo.test',
      role: 'influencer',
      influencerId: 'test-influencer-001',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    await db.collection('users').doc('test-influencer-002').set({
      email: 'influencer2@kudjo.test',
      role: 'influencer',
      influencerId: 'test-influencer-002',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    // 3. Create businesses
    await db.collection('businesses').doc('test-business-001').set({
      name: 'Manual POS Restaurant',
      email: 'business1@kudjo.test',
      address: '123 Test St, Test City, TC 12345',
      phone: '+1-555-0101',
      website: 'https://manual-pos.test',
      posProvider: 'manual',
      posConfig: {
        type: 'manual',
        setupComplete: true
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.collection('businesses').doc('test-business-002').set({
      name: 'Square POS Cafe',
      email: 'business2@kudjo.test',
      address: '456 Square Ave, Test City, TC 12346',
      phone: '+1-555-0102',
      website: 'https://square-pos.test',
      posProvider: 'square',
      posConfig: {
        type: 'square',
        applicationId: 'test-square-app',
        accessToken: 'test-square-token',
        setupComplete: true
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 4. Create influencers
    await db.collection('influencers').doc('test-influencer-001').set({
      email: 'influencer1@kudjo.test',
      displayName: 'Small Tier Influencer',
      tier: 'Small',
      followerCount: 2500,
      isVerified: false,
      socialMedia: {
        instagram: {
          username: 'smallinfluencer',
          followers: 2500,
          isVerified: false
        }
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.collection('influencers').doc('test-influencer-002').set({
      email: 'influencer2@kudjo.test',
      displayName: 'Medium Tier Influencer',
      tier: 'Medium',
      followerCount: 15000,
      isVerified: true,
      socialMedia: {
        instagram: {
          username: 'mediuminfluencer',
          followers: 15000,
          isVerified: true
        },
        tiktok: {
          username: 'mediumtiktok',
          followers: 12000,
          isVerified: false
        }
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 5. Create offers
    const offer1 = await db.collection('offers').add({
      businessId: 'test-business-001',
      title: '20% Off Any Meal',
      description: 'Get 20% off your entire order at Manual POS Restaurant',
      category: 'food',
      discountType: 'percentage',
      discountValue: 20,
      minSpend: 25,
      maxInfluencers: 50,
      currentInfluencers: 2,
      tierSplits: {
        Small: 5,
        Medium: 7,
        Large: 10,
        XL: 12,
        Huge: 15
      },
      startAt: new Date(),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const offer2 = await db.collection('offers').add({
      businessId: 'test-business-002',
      title: 'Free Coffee with Purchase',
      description: 'Get a free coffee with any food purchase at Square POS Cafe',
      category: 'food',
      discountType: 'fixed',
      discountValue: 5,
      minSpend: 15,
      maxInfluencers: 25,
      currentInfluencers: 1,
      tierSplits: {
        Small: 3,
        Medium: 5,
        Large: 8,
        XL: 10,
        Huge: 12
      },
      startAt: new Date(),
      endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 6. Create affiliate links
    await db.collection('affiliateLinks').add({
      influencerId: 'test-influencer-001',
      offerId: offer1.id,
      token: 'test-link-001',
      url: `https://kudjo.app/a/test-link-001`,
      clicks: 5,
      conversions: 1,
      status: 'active',
      createdAt: new Date(),
      lastClickAt: new Date()
    });

    await db.collection('affiliateLinks').add({
      influencerId: 'test-influencer-002',
      offerId: offer2.id,
      token: 'test-link-002',
      url: `https://kudjo.app/a/test-link-002`,
      clicks: 12,
      conversions: 3,
      status: 'active',
      createdAt: new Date(),
      lastClickAt: new Date()
    });

    // 7. Create coupons
    await db.collection('coupons').add({
      influencerId: 'test-influencer-001',
      offerId: offer1.id,
      type: 'CONTENT_MEAL',
      code: 'TEST-COUPON-001',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      status: 'active',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date()
    });

    // 8. Create redemption
    await db.collection('redemptions').add({
      couponId: 'test-coupon-001',
      influencerId: 'test-influencer-001',
      businessId: 'test-business-001',
      offerId: offer1.id,
      amountCents: 2500, // $25 order
      discountCents: 500, // $5 discount (20%)
      commissionCents: 125, // 5% of $25
      method: 'qr_scan',
      location: {
        latitude: 40.7128,
        longitude: -74.0060
      },
      deviceInfo: {
        userAgent: 'Test Browser',
        ipAddress: '127.0.0.1'
      },
      status: 'completed',
      redeemedAt: new Date(),
      createdAt: new Date()
    });

    // 9. Create payout records
    await db.collection('payouts').add({
      influencerId: 'test-influencer-001',
      amountCents: 125,
      method: 'paypal',
      paypalEmail: 'influencer1@kudjo.test',
      status: 'pending',
      requestedAt: new Date(),
      createdAt: new Date()
    });

    console.log('✅ Test data seeded successfully');
    console.log(`📊 Created:
    - 5 users (1 admin, 2 businesses, 2 influencers)
    - 2 businesses (manual POS, Square POS)
    - 2 influencers (Small tier, Medium tier)
    - 2 offers (active campaigns)
    - 2 affiliate links
    - 1 coupon (content meal type)
    - 1 redemption (completed)
    - 1 payout (pending)`);

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData().then(() => {
    console.log('🎉 Test data seeding complete');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
}

export { seedTestData };
