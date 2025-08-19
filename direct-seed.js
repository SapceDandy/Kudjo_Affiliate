const admin = require('firebase-admin');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK with service account
try {
  const serviceAccount = require('./service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Initialized Firebase with service account');
} catch (error) {
  console.error('❌ Failed to initialize with service account, falling back to default credentials');
  admin.initializeApp({
    projectId: 'kudjo-affiliate'
  });
}

const db = admin.firestore();

async function seedData() {
  try {
    console.log('🚀 Starting data seeding...');
    
    // Use batch writes for efficiency
    const batch = db.batch();
    
    // Create admin user
    const adminRef = db.collection('users').doc('admin_user');
    batch.set(adminRef, {
      id: 'admin_user',
      email: 'devon@getkudjo.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    // Create business users
    const bizUser1Ref = db.collection('users').doc('user_biz_1');
    batch.set(bizUser1Ref, {
      id: 'user_biz_1',
      email: 'mario@restaurant.com',
      role: 'business',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    // Create influencer users
    const infUser1Ref = db.collection('users').doc('user_inf_1');
    batch.set(infUser1Ref, {
      id: 'user_inf_1',
      email: 'sarah@foodie.com',
      role: 'influencer',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    // Create businesses
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
    
    // Create influencers
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
    
    // Create offers
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
    
    // Create coupons
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
    
    // Commit all the batch operations
    await batch.commit();
    
    console.log('✅ All data added successfully!');
    console.log('📊 Created:');
    console.log('  - 3 users (1 admin, 1 business, 1 influencer)');
    console.log('  - 2 businesses');
    console.log('  - 2 influencers');
    console.log('  - 1 offer');
    console.log('  - 1 coupon');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData(); 