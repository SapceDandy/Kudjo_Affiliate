/**
 * Kudjo Affiliate - Simple Database Seed Script
 * 
 * This script uses the Firebase JavaScript SDK to populate the database.
 * It doesn't require a service account key.
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  writeBatch
} = require('firebase/firestore');

// Firebase configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA",
  authDomain: "kudjo-affiliate.firebaseapp.com",
  projectId: "kudjo-affiliate",
  storageBucket: "kudjo-affiliate.firebasestorage.app",
  messagingSenderId: "943798260444",
  appId: "1:943798260444:web:c8c2ce35ee63c639865a19",
  measurementId: "G-2JNJ612PZT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Seed data for the Kudjo Affiliate platform
 */
async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...');

    // Add users
    console.log('👤 Adding users...');
    await setDoc(doc(db, 'users', 'admin_user'), {
      id: 'admin_user',
      email: 'devon@getkudjo.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    await setDoc(doc(db, 'users', 'user_biz_1'), {
      id: 'user_biz_1',
      email: 'mario@restaurant.com',
      role: 'business',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    await setDoc(doc(db, 'users', 'user_biz_2'), {
      id: 'user_biz_2',
      email: 'taco@express.com',
      role: 'business',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    await setDoc(doc(db, 'users', 'user_inf_1'), {
      id: 'user_inf_1',
      email: 'sarah@foodie.com',
      role: 'influencer',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    await setDoc(doc(db, 'users', 'user_inf_2'), {
      id: 'user_inf_2',
      email: 'mike@tastetester.com',
      role: 'influencer',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Added users');

    // Add businesses
    console.log('🏢 Adding businesses...');
    await setDoc(doc(db, 'businesses', 'biz_1'), {
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

    await setDoc(doc(db, 'businesses', 'biz_2'), {
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
    console.log('✅ Added businesses');

    // Add influencers
    console.log('🌟 Adding influencers...');
    await setDoc(doc(db, 'influencers', 'inf_1'), {
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

    await setDoc(doc(db, 'influencers', 'inf_2'), {
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
    console.log('✅ Added influencers');

    // Add offers
    console.log('🎁 Adding offers...');
    await setDoc(doc(db, 'offers', 'off_1'), {
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

    await setDoc(doc(db, 'offers', 'off_2'), {
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
    console.log('✅ Added offers');

    // Add coupons
    console.log('🎫 Adding coupons...');
    await setDoc(doc(db, 'coupons', 'AFF-MAR-FOO-ABC123'), {
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

    await setDoc(doc(db, 'coupons', 'CON-TAC-TAS-XYZ789'), {
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
    console.log('✅ Added coupons');

    // Add some redemption data
    console.log('💰 Adding redemptions...');
    await setDoc(doc(db, 'redemptions', 'red_1'), {
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
    console.log('✅ Added redemptions');

    // Add daily stats for charts
    console.log('📊 Adding stats...');
    const statsId = `AFF-MAR-FOO-ABC123_${new Date().toISOString().split('T')[0]}`;
    await setDoc(doc(db, 'couponStatsDaily', statsId), {
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
    console.log('✅ Added stats');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Created:');
    console.log('  - 5 users (1 admin, 2 business, 2 influencer)');
    console.log('  - 2 businesses');
    console.log('  - 2 influencers');
    console.log('  - 2 offers');
    console.log('  - 2 coupons');
    console.log('  - 1 redemption');
    console.log('  - 1 daily stats record');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message || error);
  }
}

// Run the seed function
seedDatabase(); 