#!/usr/bin/env ts-node

/**
 * Migration script to unify contentCoupons and affiliateLinks into the new coupons collection
 * This script migrates existing data to the unified schema as described in the audit report
 */

import { adminDb } from '../apps/web/lib/firebase-admin';
import { nanoid } from 'nanoid';

interface LegacyContentCoupon {
  id: string;
  bizId: string;
  infId: string;
  offerId: string;
  code: string;
  qrUrl?: string;
  singleUse?: boolean;
  status: string;
  createdAt: any;
  updatedAt?: any;
}

interface LegacyAffiliateLink {
  id: string;
  bizId: string;
  infId: string;
  offerId: string;
  shortCode: string;
  url: string;
  qrUrl?: string;
  status: string;
  createdAt: any;
  updatedAt?: any;
}

async function migrateCoupons() {
  console.log('🚀 Starting coupons migration...');
  
  const batch = adminDb.batch();
  let migrationCount = 0;
  const migrationLog: string[] = [];

  try {
    // 1. Migrate contentCoupons to unified coupons
    console.log('📋 Migrating contentCoupons...');
    const contentCouponsSnapshot = await adminDb.collection('contentCoupons').get();
    
    for (const doc of contentCouponsSnapshot.docs) {
      const data = doc.data() as LegacyContentCoupon;
      
      const unifiedCoupon = {
        type: 'CONTENT_MEAL',
        bizId: data.bizId,
        infId: data.infId,
        offerId: data.offerId,
        code: data.code,
        status: mapLegacyStatus(data.status),
        capCents: 5000, // Default cap as mentioned in audit
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        admin: {
          posAdded: false,
        },
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        // Migration metadata
        _migrated: {
          from: 'contentCoupons',
          originalId: doc.id,
          migratedAt: new Date(),
        },
      };

      const newCouponRef = adminDb.collection('coupons').doc();
      batch.set(newCouponRef, unifiedCoupon);
      migrationCount++;
      
      migrationLog.push(`Migrated contentCoupon ${doc.id} -> ${newCouponRef.id}`);
    }

    // 2. Migrate affiliateLinks to unified coupons
    console.log('🔗 Migrating affiliateLinks...');
    const affiliateLinksSnapshot = await adminDb.collection('affiliateLinks').get();
    
    for (const doc of affiliateLinksSnapshot.docs) {
      const data = doc.data() as LegacyAffiliateLink;
      
      const unifiedCoupon = {
        type: 'AFFILIATE',
        bizId: data.bizId,
        infId: data.infId,
        offerId: data.offerId,
        linkId: doc.id, // Preserve original link ID
        code: data.shortCode,
        status: mapLegacyStatus(data.status),
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        admin: {
          posAdded: false,
        },
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        // Migration metadata
        _migrated: {
          from: 'affiliateLinks',
          originalId: doc.id,
          migratedAt: new Date(),
        },
      };

      const newCouponRef = adminDb.collection('coupons').doc();
      batch.set(newCouponRef, unifiedCoupon);
      migrationCount++;
      
      migrationLog.push(`Migrated affiliateLink ${doc.id} -> ${newCouponRef.id}`);

      // Update the affiliateLink to reference the new coupon
      batch.update(doc.ref, {
        couponId: newCouponRef.id,
        migrated: true,
        migratedAt: new Date(),
      });
    }

    // 3. Create migration record
    const migrationRecord = {
      id: nanoid(),
      type: 'coupons_unification',
      status: 'completed',
      migratedCount,
      contentCouponsCount: contentCouponsSnapshot.size,
      affiliateLinksCount: affiliateLinksSnapshot.size,
      startedAt: new Date(),
      completedAt: new Date(),
      log: migrationLog,
    };

    batch.set(adminDb.collection('migrations').doc(), migrationRecord);

    // Commit the batch
    console.log(`💾 Committing ${migrationCount} migrations...`);
    await batch.commit();

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Statistics:
    - Content Coupons migrated: ${contentCouponsSnapshot.size}
    - Affiliate Links migrated: ${affiliateLinksSnapshot.size}
    - Total unified coupons created: ${migrationCount}
    `);

    // 4. Verify migration
    console.log('🔍 Verifying migration...');
    const unifiedCouponsSnapshot = await adminDb.collection('coupons').get();
    console.log(`✅ Verification: ${unifiedCouponsSnapshot.size} coupons in unified collection`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Log failed migration
    await adminDb.collection('migrations').add({
      id: nanoid(),
      type: 'coupons_unification',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      migratedCount,
      startedAt: new Date(),
      failedAt: new Date(),
    });
    
    throw error;
  }
}

function mapLegacyStatus(legacyStatus: string): 'active' | 'used' | 'expired' | 'revoked' {
  switch (legacyStatus?.toLowerCase()) {
    case 'active':
    case 'issued':
      return 'active';
    case 'used':
    case 'redeemed':
      return 'used';
    case 'expired':
      return 'expired';
    case 'revoked':
    case 'cancelled':
      return 'revoked';
    default:
      return 'active'; // Default fallback
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateCoupons()
    .then(() => {
      console.log('🎉 Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateCoupons };
