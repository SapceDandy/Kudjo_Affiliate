const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to use service account file first
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'kudjo-affiliate'
    });
  } catch (error) {
    console.log('Service account file not found, using environment variables');
    admin.initializeApp({
      projectId: 'kudjo-affiliate'
    });
  }
}

const db = admin.firestore();

async function addTestHandleInfluencer() {
  try {
    const testInfluencer = {
      id: 'testhandleinfluencer',
      handle: '@testhandleinfluencer',
      displayName: 'Test Handle Influencer',
      name: 'Test Handle Influencer',
      email: 'testhandleinfluencer@example.com',
      followers: 15000,
      avgViews: 8500,
      tier: 'Gold',
      platforms: ['instagram', 'tiktok'],
      platform: 'instagram',
      location: 'Los Angeles, CA',
      bio: 'Test influencer account for QA testing purposes',
      profileImage: 'https://via.placeholder.com/150',
      verified: true,
      status: 'approved',
      approved: true,
      hasVerifiedSocial: true,
      socialMedia: {
        instagram: {
          handle: 'testhandleinfluencer',
          followers: 15000,
          verified: true,
          connected: true
        },
        tiktok: {
          handle: 'testhandleinfluencer',
          followers: 12000,
          verified: false,
          connected: true
        }
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Add to influencers collection with specific document ID
    await db.collection('influencers').doc('testhandleinfluencer').set(testInfluencer);
    console.log('✅ Successfully added @testhandleinfluencer to Firestore');

    // Verify it was added
    const doc = await db.collection('influencers').doc('testhandleinfluencer').get();
    if (doc.exists) {
      console.log('✅ Verified: @testhandleinfluencer exists in database');
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    } else {
      console.log('❌ Failed to verify @testhandleinfluencer in database');
    }

  } catch (error) {
    console.error('❌ Error adding test influencer:', error);
  }
}

// Run the function
addTestHandleInfluencer().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
