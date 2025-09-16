const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
function getAdminDb() {
  try {
    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      
      if (privateKey && clientEmail && projectId) {
        const app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
        return getFirestore(app);
      }
    }
    
    return getFirestore();
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

async function debugRequests() {
  const db = getAdminDb();
  if (!db) {
    console.error('Failed to initialize Firebase');
    return;
  }

  try {
    console.log('=== CHECKING INFLUENCER REQUESTS ===');
    const requestsSnapshot = await db.collection('influencerRequests').limit(5).get();
    
    requestsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\nRequest ID: ${doc.id}`);
      console.log(`  influencerId: ${data.influencerId}`);
      console.log(`  businessId: ${data.businessId}`);
      console.log(`  bizId: ${data.bizId}`);
      console.log(`  influencerName: ${data.influencerName}`);
      console.log(`  status: ${data.status}`);
    });

    console.log('\n=== CHECKING SPECIFIC REQUEST FOR inf_1 ===');
    const inf1Requests = await db.collection('influencerRequests')
      .where('influencerId', '==', 'inf_1')
      .get();
    
    console.log(`Found ${inf1Requests.docs.length} requests for inf_1`);
    inf1Requests.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  Request: ${doc.id} - ${data.title} - ${data.status}`);
    });

    console.log('\n=== CHECKING SPECIFIC REQUEST FOR foodie_explorer ===');
    const foodieRequests = await db.collection('influencerRequests')
      .where('influencerId', '==', 'foodie_explorer')
      .get();
    
    console.log(`Found ${foodieRequests.docs.length} requests for foodie_explorer`);
    foodieRequests.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  Request: ${doc.id} - ${data.title} - ${data.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugRequests();
