/**
 * Kudjo Affiliate - Database Seed Script
 * 
 * This script populates the Firebase Firestore database with initial seed data.
 * It uses the Firebase Admin SDK with a service account for authentication.
 */

const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load service account credentials
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account.json');
  console.log('✅ Loaded service account credentials');
} catch (error) {
  console.error('❌ Failed to load service account credentials:', error.message);
  console.error('Please make sure you have a valid firebase-service-account.json file in the scripts directory.');
  console.error('You can generate this file from the Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

// Initialize Firebase Admin SDK (normalize private_key newlines)
if (admin.apps.length === 0) {
  const normalized = {
    ...serviceAccount,
    private_key: (serviceAccount.private_key || '').replace(/\\n/g, '\n'),
  };
  admin.initializeApp({
    credential: admin.credential.cert(normalized)
  });
  console.log('✅ Initialized Firebase Admin SDK');
}

const db = admin.firestore();

/**
 * Seed data for the Kudjo Affiliate platform
 */
async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...');

    // Create a batch for efficient writes
    const batch = db.batch();

    console.log('📝 Preparing data...');

    // Add admin user
    const adminUserRef = db.collection('users').doc('admin_user');
    batch.set(adminUserRef, {
      id: 'admin_user',
      email: 'devon@getkudjo.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    // Add business users
    const bizUser1Ref = db.collection('users').doc('user_biz_1');
    batch.set(bizUser1Ref, {
      id: 'user_biz_1',
      email: 'mario@restaurant.com',
      role: 'business',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    const bizUser2Ref = db.collection('users').doc('user_biz_2');
    batch.set(bizUser2Ref, {
      id: 'user_biz_2',
      email: 'taco@express.com',
      role: 'business',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    // Add influencer users
    const infUser1Ref = db.collection('users').doc('user_inf_1');
    batch.set(infUser1Ref, {
      id: 'user_inf_1',
      email: 'sarah@foodie.com',
      role: 'influencer',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    const infUser2Ref = db.collection('users').doc('user_inf_2');
    batch.set(infUser2Ref, {
      id: 'user_inf_2',
      email: 'mike@tastetester.com',
      role: 'influencer',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    // Add businesses
    const biz1Ref = db.collection('businesses').doc('biz_1');
    batch.set(biz1Ref, {
      id: 'biz_1',
      name: "Mario's Italian Bistro",
      address: '123 Main St, Downtown',
      phone: '555-123-4567',
      cuisine: 'Italian',
      posIntegrated: true,
      createdAt: new Date().toISOString(),
      ownerId: 'user_biz_1',
      status: 'active'
    });

    const biz2Ref = db.collection('businesses').doc('biz_2');
    batch.set(biz2Ref, {
      id: 'biz_2',
      name: 'Taco Express',
      address: '456 Oak Ave, Midtown',
      phone: '555-234-5678',
      cuisine: 'Mexican',
      posIntegrated: false,
      createdAt: new Date().toISOString(),
      ownerId: 'user_biz_2',
      status: 'active'
    });

    // Add influencers
    const inf1Ref = db.collection('influencers').doc('inf_1');
    batch.set(inf1Ref, {
      id: 'inf_1',
      handle: 'foodie_explorer',
      name: 'Sarah Johnson',
      followers: 25000,
      avgViews: 12000,
      tier: 'Silver',
      createdAt: new Date().toISOString(),
      ownerId: 'user_inf_1',
      status: 'active'
    });

    const inf2Ref = db.collection('influencers').doc('inf_2');
    batch.set(inf2Ref, {
      id: 'inf_2',
      handle: 'taste_tester',
      name: 'Mike Chen',
      followers: 85000,
      avgViews: 35000,
      tier: 'Gold',
      createdAt: new Date().toISOString(),
      ownerId: 'user_inf_2',
      status: 'active'
    });

    // Add offers
    const off1Ref = db.collection('offers').doc('off_1');
    batch.set(off1Ref, {
      id: 'off_1',
      businessId: 'biz_1',
      title: '20% Off Italian Dinner',
      description: 'Get 20% off any dinner entree',
      discountPercent: 20,
      maxRedemptions: 100,
      currentRedemptions: 5,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    const off2Ref = db.collection('offers').doc('off_2');
    batch.set(off2Ref, {
      id: 'off_2',
      businessId: 'biz_2',
      title: 'Free Drink with Meal',
      description: 'Get a free drink with any meal purchase',
      discountPercent: 15,
      maxRedemptions: 50,
      currentRedemptions: 12,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    // Add coupons
    const coupon1Ref = db.collection('coupons').doc('AFF-MAR-FOO-ABC123');
    batch.set(coupon1Ref, {
      id: 'AFF-MAR-FOO-ABC123',
      type: 'AFFILIATE',
      businessId: 'biz_1',
      influencerId: 'inf_1',
      offerId: 'off_1',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
      posAdded: true,
      usageCount: 3,
      lastUsedAt: new Date().toISOString()
    });

    const coupon2Ref = db.collection('coupons').doc('CON-TAC-TAS-XYZ789');
    batch.set(coupon2Ref, {
      id: 'CON-TAC-TAS-XYZ789',
      type: 'CONTENT_MEAL',
      businessId: 'biz_2',
      influencerId: 'inf_2',
      offerId: 'off_2',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
      posAdded: false,
      usageCount: 1,
      lastUsedAt: new Date().toISOString()
    });

    // Add some redemption data
    const redemption1Ref = db.collection('redemptions').doc('red_1');
    batch.set(redemption1Ref, {
      id: 'red_1',
      couponId: 'AFF-MAR-FOO-ABC123',
      businessId: 'biz_1',
      influencerId: 'inf_1',
      amount: 45.99,
      commission: 4.60,
      createdAt: new Date().toISOString(),
      status: 'COMPLETED',
      source: 'POS'
    });

    // Add daily stats for charts
    const statsId = `AFF-MAR-FOO-ABC123_${new Date().toISOString().split('T')[0]}`;
    const stats1Ref = db.collection('couponStatsDaily').doc(statsId);
    batch.set(stats1Ref, {
      id: statsId,
      couponId: 'AFF-MAR-FOO-ABC123',
      businessId: 'biz_1',
      influencerId: 'inf_1',
      date: new Date().toISOString().split('T')[0],
      views: 120,
      clicks: 45,
      redemptions: 3,
      revenue: 137.97,
      commission: 13.80
    });

    console.log('💾 Committing batch write...');
    
    // Commit the batch
    await batch.commit();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Created:');
    console.log('  - 5 users (1 admin, 2 business, 2 influencer)');
    console.log('  - 2 businesses');
    console.log('  - 2 influencers');
    console.log('  - 2 offers');
    console.log('  - 2 coupons');
    console.log('  - 1 redemption');
    console.log('  - 1 daily stats record');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase(); 