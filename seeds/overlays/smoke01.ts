import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '../../apps/web/lib/firebase-admin';
import { detId, shortCode, detTimestamp } from '../lib/ids';
import { createReceiptCapture } from '../lib/receipts';
import { createBaseEntities } from '../base';

// Smoke-01: merchant approval → publish campaign → affiliate links → user redeems → payout visible
export async function applySmoke01(): Promise<void> {
  const capture = createReceiptCapture();
  capture.log('info', 'Applying Smoke-01 overlay: Full redemption journey');

  try {
    await initializeFirebaseAdmin();
    const db = getFirestore();

    // Ensure base entities exist
    const entities = await createBaseEntities();
    const merchantId = entities.merchants[0].id; // Pasta Palace
    const affiliateId = entities.affiliates[0].id; // foodie_sarah
    const userId = entities.users[0].id; // +15125550101

    // 1. Create a published campaign/offer
    const campaignId = detId("campaign", merchantId, "lunch-special", "v1");
    const campaignData = {
      merchantId,
      title: "Lunch Special - 15% Off",
      description: "Great pasta lunch deals",
      type: "time_window",
      value: 15, // 15% off
      minOrder: 15,
      window: "11:30-13:30",
      validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      status: "published",
      maxInfluencers: 10,
      currentInfluencers: 1,
      createdAt: detTimestamp("campaign:lunch-special"),
      publishedAt: detTimestamp("campaign:lunch-special:published")
    };

    await db.collection('offers').doc(campaignId).set(campaignData);
    capture.log('info', `Created campaign: ${campaignId}`);

    // 2. Create affiliate link to campaign
    const linkId = detId("link", affiliateId, campaignId);
    const linkData = {
      affiliateId,
      campaignId,
      merchantId,
      code: shortCode(`${affiliateId}:${campaignId}`),
      url: `https://kudjo.app/r/${shortCode(`${affiliateId}:${campaignId}`)}`,
      status: "active",
      clicks: 0,
      conversions: 0,
      createdAt: detTimestamp("link:lunch-special")
    };

    await db.collection('affiliateLinks').doc(linkId).set(linkData);
    capture.log('info', `Created affiliate link: ${linkData.code}`);

    // 3. Create coupon (user clicked link and got coupon)
    const couponId = detId("coupon", userId, campaignId, "redeemed");
    const couponData = {
      id: couponId,
      userId,
      merchantId,
      affiliateId,
      campaignId,
      linkId,
      code: shortCode(`${couponId}:USER`),
      type: "time_window",
      value: 15,
      minOrder: 15,
      window: "11:30-13:30",
      status: "redeemed",
      issuedAt: detTimestamp("coupon:issued"),
      redeemedAt: detTimestamp("coupon:redeemed"),
      orderAmount: 25.50,
      discountAmount: 3.83, // 15% of 25.50
      expiresAt: new Date(detTimestamp("coupon:issued").getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    await db.collection('coupons').doc(couponId).set(couponData);
    capture.log('info', `Created redeemed coupon: ${couponData.code}`);

    // 4. Create redemption record
    const redemptionId = detId("redemption", couponId);
    const redemptionData = {
      couponId,
      userId,
      merchantId,
      affiliateId,
      orderAmount: 25.50,
      discountAmount: 3.83,
      affiliateEarning: 0.57, // 15% of discount (3.83 * 0.15)
      redeemedAt: detTimestamp("coupon:redeemed"),
      status: "completed"
    };

    await db.collection('redemptions').doc(redemptionId).set(redemptionData);
    capture.log('info', `Created redemption record: ${redemptionId}`);

    // 5. Update affiliate link stats
    await db.collection('affiliateLinks').doc(linkId).update({
      clicks: 1,
      conversions: 1,
      lastConversion: detTimestamp("coupon:redeemed")
    });

    // 6. Create payout record (visible to affiliate)
    const payoutId = detId("payout", affiliateId, "2025-01");
    const payoutData = {
      affiliateId,
      period: "2025-01",
      totalEarnings: 0.57,
      redemptionCount: 1,
      status: "pending",
      createdAt: detTimestamp("payout:created"),
      redemptions: [redemptionId]
    };

    await db.collection('payouts').doc(payoutId).set(payoutData);
    capture.log('info', `Created payout record: ${payoutId}`);

    // Capture receipt
    const snapshot = await db.collection('coupons').where('status', '==', 'redeemed').get();
    
    await capture.writeReceipts('seed', 'smoke01', {
      ok: true,
      inputs: { profile: 'smoke01' },
      outputs: {
        campaigns: 1,
        affiliateLinks: 1,
        coupons: 1,
        redemptions: 1,
        payouts: 1,
        totalRedeemedCoupons: snapshot.size
      }
    });

  } catch (error) {
    await capture.writeReceipts('seed', 'smoke01', {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
