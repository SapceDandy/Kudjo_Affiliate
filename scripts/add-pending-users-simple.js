// Simple script to add pending users using environment variables
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin using environment variables
let app;
try {
  // Try to use environment variables first
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Fallback to service account file
    const serviceAccount = require('../service-account.json');
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  }
} catch (error) {
  console.error('Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = getFirestore(app);

async function addPendingUsers() {
  console.log('Adding pending users for testing...');

  const timestamp = new Date().toISOString();

  // Add pending business
  const pendingBusiness = {
    businessName: 'Fresh Eats Cafe',
    email: 'owner@fresheats.com',
    phone: '+1-555-0123',
    website: 'https://fresheats.com',
    category: 'Food & Beverage',
    description: 'Local organic cafe specializing in fresh, healthy meals and artisanal coffee.',
    approvalStatus: 'pending',
    approved: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102'
    }
  };

  // Add pending influencer
  const pendingInfluencer = {
    name: 'Sarah Johnson',
    email: 'sarah@foodiegram.com',
    phone: '+1-555-0789',
    tier: 'M',
    followers: 45000,
    category: 'Food & Lifestyle',
    description: 'Food blogger and lifestyle influencer sharing healthy recipes and restaurant reviews.',
    approvalStatus: 'pending',
    approved: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    socialMedia: {
      instagram: '@sarahfoodie',
      tiktok: '@sarahcooks'
    }
  };

  try {
    // Add business
    await db.collection('businesses').doc('test_pending_business').set(pendingBusiness);
    console.log('✅ Added pending business: Fresh Eats Cafe');

    // Add influencer
    await db.collection('influencers').doc('test_pending_influencer').set(pendingInfluencer);
    console.log('✅ Added pending influencer: Sarah Johnson');

    console.log('\n🎉 Successfully added 2 pending users for approval testing!');
    
  } catch (error) {
    console.error('❌ Error adding pending users:', error);
  }
}

addPendingUsers()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
