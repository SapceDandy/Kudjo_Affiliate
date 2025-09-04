const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'kudjo-affiliate'
});

const db = getFirestore();

async function seedV2Data() {
  console.log('🌱 Starting v2 schema data seeding...');
  
  try {
    // Load v2 seed data
    const seedDataPath = path.join(__dirname, '..', 'seed-data-v2.json');
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    
    // Clear existing collections first
    await clearCollections();
    
    // Seed collections in dependency order
    await seedCollection('users', seedData.users);
    await seedCollection('businesses', seedData.businesses);
    await seedCollection('influencers', seedData.influencers);
    await seedCollection('offers', seedData.offers);
    await seedCollection('offer_assignments', seedData.offer_assignments);
    await seedCollection('affiliate_links', seedData.affiliate_links);
    await seedCollection('coupons', seedData.coupons);
    await seedCollection('influencerRequests', seedData.influencerRequests);
    await seedCollection('business_metrics', seedData.business_metrics);
    await seedNestedCollection('business_metrics_daily', seedData.business_metrics_daily);
    await seedCollection('redemptions', seedData.redemptions);
    
    console.log('✅ v2 schema data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

async function clearCollections() {
  console.log('🧹 Clearing existing collections...');
  
  const collections = [
    'users', 'businesses', 'influencers', 'offers', 
    'offer_assignments', 'affiliate_links', 'coupons', 
    'influencerRequests', 'business_metrics', 'business_metrics_daily',
    'redemptions', 'affiliateLinks' // Clear old schema too
  ];
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`  Cleared ${snapshot.docs.length} documents from ${collectionName}`);
      }
    } catch (error) {
      console.log(`  Collection ${collectionName} doesn't exist or is empty`);
    }
  }
}

async function seedCollection(collectionName, data) {
  if (!data) {
    console.log(`  Skipping ${collectionName} - no data provided`);
    return;
  }
  
  console.log(`📋 Seeding ${collectionName}...`);
  const batch = db.batch();
  let count = 0;
  
  for (const [docId, docData] of Object.entries(data)) {
    const docRef = db.collection(collectionName).doc(docId);
    
    // Convert date strings to Firestore timestamps
    const processedData = convertDatesToTimestamps(docData);
    
    batch.set(docRef, processedData);
    count++;
    
    // Commit batch every 500 operations
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`  Processed ${count} documents...`);
    }
  }
  
  // Commit remaining operations
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Seeded ${count} documents in ${collectionName}`);
}

async function seedNestedCollection(collectionName, data) {
  if (!data) {
    console.log(`  Skipping ${collectionName} - no data provided`);
    return;
  }
  
  console.log(`📋 Seeding nested collection ${collectionName}...`);
  const batch = db.batch();
  let count = 0;
  
  for (const [parentId, nestedData] of Object.entries(data)) {
    for (const [docId, docData] of Object.entries(nestedData)) {
      const docRef = db.collection(collectionName).doc(parentId).collection('daily').doc(docId);
      
      // Convert date strings to Firestore timestamps
      const processedData = convertDatesToTimestamps(docData);
      
      batch.set(docRef, processedData);
      count++;
      
      // Commit batch every 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`  Processed ${count} documents...`);
      }
    }
  }
  
  // Commit remaining operations
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Seeded ${count} documents in ${collectionName}`);
}

function convertDatesToTimestamps(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamps);
  }
  
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && (key.includes('At') || key === 'date') && value.includes('T')) {
      // Convert ISO date strings to Firestore timestamps
      result[key] = admin.firestore.Timestamp.fromDate(new Date(value));
    } else if (typeof value === 'object' && value !== null) {
      result[key] = convertDatesToTimestamps(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Run seeding
if (require.main === module) {
  seedV2Data()
    .then(() => {
      console.log('🎉 Data seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Data seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedV2Data };
