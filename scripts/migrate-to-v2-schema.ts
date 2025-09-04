import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'kudjo-affiliate'
});

const db = getFirestore();

async function migrateToV2Schema() {
  console.log('🚀 Starting migration to v2 schema...');
  
  try {
    // Step 1: Migrate affiliateLinks -> affiliate_links with proper assignment tracking
    await migrateAffiliateLinks();
    
    // Step 2: Create offer_assignments collection
    await createOfferAssignments();
    
    // Step 3: Convert businessMetrics to derived metrics
    await migrateBusinessMetrics();
    
    // Step 4: Update coupons to reference assignments
    await updateCouponsWithAssignments();
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// 1) Move affiliateLinks -> affiliate_links and wire assignment
async function migrateAffiliateLinks() {
  console.log('📋 Migrating affiliateLinks to affiliate_links...');
  
  const src = await db.collection("affiliateLinks").get();
  const batch = db.batch();
  let count = 0;
  
  for (const doc of src.docs) {
    const d = doc.data();
    const offerId = d.offerId ?? null;
    const infId = d.infId ?? d.influencerId ?? null;
    const businessId = d.bizId ?? d.businessId ?? null;
    const token = d.shortCode ?? d.urlToken ?? doc.id.slice(0, 6);
    const linkId = token; // use token as doc id for uniqueness

    if (offerId && infId && businessId) {
      const asgId = `off_${offerId}__inf_${infId}`;
      
      // Create offer assignment
      const assignmentRef = db.collection("offer_assignments").doc(asgId);
      batch.set(assignmentRef, {
        id: asgId,
        offerId,
        businessId,
        influencerId: infId,
        status: "active",
        tracking: {
          affiliateLinkId: linkId
        },
        stats: {
          clicks: 0,
          conversions: 0,
          revenue: 0
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Create new affiliate link
      const linkRef = db.collection("affiliate_links").doc(linkId);
      batch.set(linkRef, {
        id: linkId,
        assignmentId: asgId,
        urlToken: token,
        status: d.status ?? "active",
        destinationUrl: d.url ?? null,
        qrUrl: d.qrUrl ?? null,
        utm: d.utm ?? null,
        businessId, 
        influencerId: infId, 
        offerId,   // denorms for convenience
        createdAt: d.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      count++;
      
      // Commit batch every 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`  Processed ${count} affiliate links...`);
      }
    }
  }
  
  // Commit remaining operations
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Migrated ${count} affiliate links`);
}

// 2) Create offer_assignments from existing data
async function createOfferAssignments() {
  console.log('📋 Creating offer assignments from existing requests...');
  
  // Get all approved influencer requests to create assignments
  const requests = await db.collection("influencerRequests")
    .where("status", "==", "approved")
    .get();
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of requests.docs) {
    const req = doc.data();
    const { offerId, influencerId, businessId } = req;
    
    if (offerId && influencerId && businessId) {
      const asgId = `off_${offerId}__inf_${influencerId}`;
      const assignmentRef = db.collection("offer_assignments").doc(asgId);
      
      batch.set(assignmentRef, {
        id: asgId,
        offerId,
        businessId,
        influencerId,
        status: "active",
        requestId: doc.id,
        terms: req.terms || {},
        tracking: {},
        stats: {
          clicks: 0,
          conversions: 0,
          revenue: 0
        },
        createdAt: req.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      count++;
      
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`  Created ${count} assignments...`);
      }
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Created ${count} offer assignments`);
}

// 3) Convert businessMetrics to derived metrics
async function migrateBusinessMetrics() {
  console.log('📋 Converting businessMetrics to derived metrics...');
  
  const businesses = await db.collection("businesses").get();
  const batch = db.batch();
  
  for (const bizDoc of businesses.docs) {
    const businessId = bizDoc.id;
    
    // Count current data for initial metrics
    const [requests, assignments, coupons, redemptions] = await Promise.all([
      db.collection("influencerRequests").where("businessId", "==", businessId).where("status", "==", "pending").get(),
      db.collection("offer_assignments").where("businessId", "==", businessId).where("status", "==", "active").get(),
      db.collection("coupons").where("businessId", "==", businessId).get(),
      db.collection("redemptions").where("businessId", "==", businessId).get()
    ]);
    
    // Calculate today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRedemptions = redemptions.docs.filter(doc => {
      const redeemedAt = doc.data().redeemedAt?.toDate();
      return redeemedAt && redeemedAt >= today;
    });
    
    const todayGmv = todayRedemptions.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    const todayFees = Math.round(todayGmv * 0.01 + (todayRedemptions.length * 20));
    
    // Create business metrics snapshot
    const metricsRef = db.collection("business_metrics").doc(businessId);
    batch.set(metricsRef, {
      businessId,
      activeRequests: requests.size,
      activeAssignments: assignments.size,
      issuedCoupons: coupons.size,
      redeemedToday: todayRedemptions.length,
      gmvCentsToday: todayGmv * 100, // Convert to cents
      feesCentsToday: todayFees,
      lastComputedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create today's daily metrics
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const dailyRef = db.collection("business_metrics_daily").doc(businessId).collection("daily").doc(dateStr);
    batch.set(dailyRef, {
      date: today.toISOString().slice(0, 10),
      businessId,
      issued: 0, // Will be updated by functions
      redeemed: todayRedemptions.length,
      gmvCents: todayGmv * 100,
      feesCents: todayFees,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  
  await batch.commit();
  console.log(`✅ Created derived metrics for ${businesses.size} businesses`);
}

// 4) Update coupons to reference assignments
async function updateCouponsWithAssignments() {
  console.log('📋 Updating coupons with assignment references...');
  
  const coupons = await db.collection("coupons").get();
  const batch = db.batch();
  let count = 0;
  
  for (const doc of coupons.docs) {
    const coupon = doc.data();
    const { offerId, influencerId } = coupon;
    
    if (offerId && influencerId) {
      const assignmentId = `off_${offerId}__inf_${influencerId}`;
      
      batch.update(doc.ref, {
        assignmentId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update assignment to reference coupon
      const assignmentRef = db.collection("offer_assignments").doc(assignmentId);
      batch.set(assignmentRef, {
        tracking: {
          couponId: doc.id
        }
      }, { merge: true });
      
      count++;
      
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`  Updated ${count} coupons...`);
      }
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Updated ${count} coupons with assignment references`);
}

// Run migration
if (require.main === module) {
  migrateToV2Schema()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateToV2Schema };
