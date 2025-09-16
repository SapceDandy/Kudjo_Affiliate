import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

interface InfluencerMapping {
  handle: string;
  uid: string;
  name: string;
}

async function migrateRequestIds() {
  const db = getAdminDb();
  if (!db) {
    console.error('Failed to initialize Firebase');
    return;
  }

  try {
    console.log('🔍 Starting request ID migration...');

    // Step 1: Get all influencers to build handle -> UID mapping
    console.log('📋 Building influencer handle -> UID mapping...');
    const influencersSnapshot = await db.collection('influencers').get();
    const influencerMap = new Map<string, InfluencerMapping>();
    
    influencersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const handle = data.handle || data.name || data.displayName;
      if (handle) {
        // Remove @ symbol if present
        const cleanHandle = handle.replace('@', '');
        influencerMap.set(cleanHandle.toLowerCase(), {
          handle: cleanHandle,
          uid: doc.id,
          name: data.name || data.displayName || handle
        });
      }
    });

    console.log(`📊 Found ${influencerMap.size} influencers with handles`);

    // Step 2: Get all requests that need migration
    console.log('🔍 Finding requests that need migration...');
    const requestsSnapshot = await db.collection('influencerRequests').get();
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of requestsSnapshot.docs) {
      const data = doc.data();
      const currentInfluencerId = data.influencerId;
      
      // Skip if already using proper UID format (starts with inf_ or is a long UUID)
      if (currentInfluencerId?.startsWith('inf_') || 
          (currentInfluencerId?.length > 20 && currentInfluencerId?.includes('-'))) {
        skippedCount++;
        continue;
      }

      // Try to find the proper UID for this influencer
      let properUid: string | null = null;
      
      // First try exact handle match
      const mapping = influencerMap.get(currentInfluencerId?.toLowerCase());
      if (mapping) {
        properUid = mapping.uid;
      } else {
        // Try to find by name
        const influencerName = data.influencerName;
        if (influencerName) {
          const nameMapping = Array.from(influencerMap.values()).find(
            m => m.name.toLowerCase() === influencerName.toLowerCase()
          );
          if (nameMapping) {
            properUid = nameMapping.uid;
          }
        }
      }

      if (properUid) {
        console.log(`✅ Migrating request ${doc.id}: ${currentInfluencerId} -> ${properUid}`);
        
        batch.update(doc.ref, {
          influencerId: properUid,
          migratedAt: new Date(),
          originalInfluencerId: currentInfluencerId
        });
        
        migratedCount++;
        batchCount++;
        
        // Commit batch every 500 operations to avoid limits
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`💾 Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      } else {
        console.warn(`⚠️  Could not find UID for influencer: ${currentInfluencerId} (${data.influencerName})`);
        errorCount++;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} updates`);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Migrated: ${migratedCount} requests`);
    console.log(`⏭️  Skipped: ${skippedCount} requests (already using proper UIDs)`);
    console.log(`❌ Errors: ${errorCount} requests (could not find matching UID)`);
    console.log(`📋 Total processed: ${requestsSnapshot.docs.length} requests`);

    // Step 3: Verify migration by checking a few migrated requests
    console.log('\n🔍 Verifying migration...');
    const verifySnapshot = await db.collection('influencerRequests')
      .where('migratedAt', '!=', null)
      .limit(5)
      .get();
    
    console.log(`✅ Verification: Found ${verifySnapshot.docs.length} migrated requests`);
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.originalInfluencerId} -> ${data.influencerId}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRequestIds().then(() => {
    console.log('🎉 Migration completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
}

export { migrateRequestIds };
