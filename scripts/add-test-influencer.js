const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try environment variables first
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'kudjo-affiliate'
    });
  } catch (error) {
    console.log('Using service account file...');
    admin.initializeApp({
      credential: admin.credential.cert(require('../service-account.json')),
      projectId: 'kudjo-affiliate'
    });
  }
}

const db = admin.firestore();

async function addTestInfluencer() {
  try {
    const testInfluencer = {
      id: 'testhandleinfluencer',
      name: 'Test Handle Influencer',
      displayName: 'Test Handle Influencer',
      handle: 'testhandleinfluencer',
      username: 'testhandleinfluencer',
      email: 'test@testhandleinfluencer.com',
      followers: 15000,
      avgViews: 2500,
      tier: 'Micro',
      platforms: ['instagram', 'tiktok'],
      location: 'Los Angeles, CA',
      bio: 'Test influencer account for development and testing purposes. Food & lifestyle content creator.',
      profileImage: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=TH',
      verified: true,
      status: 'active',
      engagementRate: 0.08,
      categories: ['food', 'lifestyle', 'travel'],
      socialMedia: {
        instagram: {
          handle: 'testhandleinfluencer',
          followers: 15000,
          verified: true
        },
        tiktok: {
          handle: 'testhandleinfluencer',
          followers: 8500,
          verified: false
        }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('influencers').doc('testhandleinfluencer').set(testInfluencer);
    console.log('✅ Successfully added @testhandleinfluencer to the database');
    
    // Also add a few more test influencers for better search results
    const additionalInfluencers = [
      {
        id: 'foodie_sarah',
        name: 'Sarah Johnson',
        displayName: 'Sarah Johnson',
        handle: 'foodie_sarah',
        username: 'foodie_sarah',
        email: 'sarah@foodiesarah.com',
        followers: 45000,
        avgViews: 7500,
        tier: 'Micro',
        platforms: ['instagram'],
        location: 'New York, NY',
        bio: 'NYC food blogger sharing the best eats in the city 🍕🥗',
        profileImage: 'https://via.placeholder.com/150/4ECDC4/FFFFFF?text=SJ',
        verified: false,
        status: 'active',
        engagementRate: 0.06,
        categories: ['food', 'restaurants'],
        socialMedia: {
          instagram: {
            handle: 'foodie_sarah',
            followers: 45000,
            verified: false
          }
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'lifestyle_mike',
        name: 'Mike Chen',
        displayName: 'Mike Chen',
        handle: 'lifestyle_mike',
        username: 'lifestyle_mike',
        email: 'mike@lifestylemike.com',
        followers: 125000,
        avgViews: 18000,
        tier: 'Mid',
        platforms: ['instagram', 'tiktok'],
        location: 'San Francisco, CA',
        bio: 'Lifestyle content creator | Tech reviews | Coffee enthusiast ☕',
        profileImage: 'https://via.placeholder.com/150/45B7D1/FFFFFF?text=MC',
        verified: true,
        status: 'active',
        engagementRate: 0.07,
        categories: ['lifestyle', 'tech', 'coffee'],
        socialMedia: {
          instagram: {
            handle: 'lifestyle_mike',
            followers: 125000,
            verified: true
          },
          tiktok: {
            handle: 'lifestyle_mike',
            followers: 89000,
            verified: false
          }
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const influencer of additionalInfluencers) {
      await db.collection('influencers').doc(influencer.id).set(influencer);
      console.log(`✅ Added @${influencer.handle} to the database`);
    }

    console.log('🎉 All test influencers added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test influencer:', error);
    process.exit(1);
  }
}

addTestInfluencer();
