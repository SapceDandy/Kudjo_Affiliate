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

async function seedFirestoreLarge() {
  console.log('🌱 Starting large-scale Firestore seeding...');
  
  try {
    // Clear existing collections first
    await clearCollections();
    
    // Load generated seed data
    const seedDir = path.join(__dirname, '..', 'seed');
    
    const collections = [
      'users',
      'businesses', 
      'influencers',
      'offers',
      'offer_assignments',
      'coupons',
      'affiliateLinks',
      'redemptions',
      'businessMetrics',
      'campaignLogs'
    ];
    
    for (const collectionName of collections) {
      const filePath = path.join(seedDir, `${collectionName}.json`);
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        await seedCollection(collectionName, data);
      } else {
        console.log(`⚠️  File not found: ${filePath}`);
      }
    }
    
    // Generate derived metrics for each business
    await generateDerivedMetrics();
    
    console.log('✅ Large-scale Firestore seeding completed successfully!');
    
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
    'redemptions', 'affiliateLinks', 'businessMetrics', 'campaignLogs'
  ];
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`  Collection ${collectionName} is already empty`);
        continue;
      }
      
      // Delete in batches of 500
      const batches = [];
      let batch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
        
        if (count % 500 === 0) {
          batches.push(batch);
          batch = db.batch();
        }
      });
      
      if (count % 500 !== 0) {
        batches.push(batch);
      }
      
      // Execute all batches
      for (const b of batches) {
        await b.commit();
      }
      
      console.log(`  Cleared ${snapshot.docs.length} documents from ${collectionName}`);
      
    } catch (error) {
      console.log(`  Collection ${collectionName} doesn't exist or error: ${error.message}`);
    }
  }
}

async function seedCollection(collectionName, data) {
  if (!data || data.length === 0) {
    console.log(`  Skipping ${collectionName} - no data provided`);
    return;
  }
  
  console.log(`📋 Seeding ${collectionName}...`);
  
  // Process in batches of 500 (Firestore limit)
  const batches = [];
  let batch = db.batch();
  let count = 0;
  
  for (const item of data) {
    // Use businessId as document ID for businessMetrics collection
    const docId = collectionName === 'businessMetrics' ? item.businessId : item.id;
    
    if (!docId) {
      console.log(`⚠️  Skipping item with missing ID in ${collectionName}:`, item);
      continue;
    }
    
    const docRef = db.collection(collectionName).doc(docId);
    
    // Convert date strings to Firestore timestamps
    const processedData = convertDatesToTimestamps(item);
    
    batch.set(docRef, processedData);
    count++;
    
    // Create new batch every 500 operations
    if (count % 500 === 0) {
      batches.push(batch);
      batch = db.batch();
    }
  }
  
  // Add remaining operations to final batch
  if (count % 500 !== 0) {
    batches.push(batch);
  }
  
  // Execute all batches
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`  Processed batch ${i + 1}/${batches.length} (${Math.min((i + 1) * 500, count)} documents)`);
  }
  
  console.log(`✅ Seeded ${count} documents in ${collectionName}`);
}

async function generateDerivedMetrics() {
  console.log('📊 Generating derived business metrics...');
  
  // Get all businesses
  const businessesSnapshot = await db.collection('businesses').get();
  const businesses = businessesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  for (const business of businesses) {
    // Get redemptions for this business
    const redemptionsSnapshot = await db.collection('redemptions')
      .where('businessId', '==', business.id)
      .get();
    
    // Get active assignments
    const assignmentsSnapshot = await db.collection('offer_assignments')
      .where('businessId', '==', business.id)
      .where('status', '==', 'active')
      .get();
    
    // Get active offers
    const offersSnapshot = await db.collection('offers')
      .where('businessId', '==', business.id)
      .where('status', '==', 'active')
      .get();
    
    // Get pending requests (if any)
    const requestsSnapshot = await db.collection('influencerRequests')
      .where('businessId', '==', business.id)
      .where('status', '==', 'pending')
      .get();
    
    // Calculate metrics
    const redemptions = redemptionsSnapshot.docs.map(doc => doc.data());
    const totalRevenue = redemptions.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPayouts = redemptions.reduce((sum, r) => sum + (r.influencerEarnings || 0), 0);
    
    // Today's metrics (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayRedemptions = redemptions.filter(r => {
      const redeemedAt = new Date(r.redeemedAt);
      return redeemedAt > yesterday;
    });
    
    const todayRevenue = todayRedemptions.reduce((sum, r) => sum + (r.amount || 0), 0);
    const todayPayouts = todayRedemptions.reduce((sum, r) => sum + (r.influencerEarnings || 0), 0);
    
    // Create business metrics document
    const metricsData = {
      businessId: business.id,
      activeRequests: requestsSnapshot.size,
      activeAssignments: assignmentsSnapshot.size,
      activeOffers: offersSnapshot.size,
      issuedCoupons: assignmentsSnapshot.size, // Each assignment has a coupon
      redeemedToday: todayRedemptions.length,
      gmvCentsToday: Math.round(todayRevenue * 100),
      feesCentsToday: Math.round(todayRevenue * 0.03), // 3% platform fee
      totalRedemptions: redemptions.length,
      totalRevenueCents: Math.round(totalRevenue * 100),
      totalPayoutsCents: Math.round(totalPayouts * 100),
      lastComputedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('business_metrics').doc(business.id).set(metricsData);
    
    // Create daily metrics for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayRedemptions = redemptions.filter(r => {
        const redeemedAt = new Date(r.redeemedAt);
        return redeemedAt >= dayStart && redeemedAt <= dayEnd;
      });
      
      const dayRevenue = dayRedemptions.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const dailyMetrics = {
        date: date.toISOString().slice(0, 10),
        businessId: business.id,
        issued: Math.floor(Math.random() * 5), // Random new coupons issued
        redeemed: dayRedemptions.length,
        gmvCents: Math.round(dayRevenue * 100),
        feesCents: Math.round(dayRevenue * 0.03 * 100),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('business_metrics_daily')
        .doc(business.id)
        .collection('daily')
        .doc(dateStr)
        .set(dailyMetrics);
    }
  }
  
  console.log(`✅ Generated derived metrics for ${businesses.length} businesses`);
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
  seedFirestoreLarge()
    .then(() => {
      console.log('🎉 Large-scale Firestore seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Large-scale seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedFirestoreLarge };
