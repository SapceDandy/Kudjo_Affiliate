import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '../apps/web/lib/firebase-admin';
import { createReceiptCapture } from '../seeds/lib/receipts';
import { applySmoke01 } from '../seeds/overlays/smoke01';
import { detId } from '../seeds/lib/ids';

// Smoke-01: merchant approval → publish campaign → affiliate links → user redeems → payout visible
export async function runSmoke01(): Promise<void> {
  const capture = createReceiptCapture();
  capture.log('info', 'Running Smoke-01: Full redemption journey');

  try {
    // 1. Apply seed data
    await applySmoke01();
    capture.log('info', 'Seed data applied successfully');

    // 2. Initialize Firebase and verify data
    await initializeFirebaseAdmin();
    const db = getFirestore();

    // 3. Verify merchant approval (should be approved from base seed)
    const merchantId = detId("merchant", "Pasta Palace", "Austin", "v1");
    const merchantDoc = await db.collection('businesses').doc(merchantId).get();
    
    if (!merchantDoc.exists || merchantDoc.data()?.status !== 'approved') {
      throw new Error('Merchant not approved');
    }
    capture.log('info', '✅ Merchant approval verified');

    // 4. Verify published campaign exists
    const campaignId = detId("campaign", merchantId, "lunch-special", "v1");
    const campaignDoc = await db.collection('offers').doc(campaignId).get();
    
    if (!campaignDoc.exists || campaignDoc.data()?.status !== 'published') {
      throw new Error('Campaign not published');
    }
    capture.log('info', '✅ Published campaign verified');

    // 5. Verify affiliate link exists and is active
    const affiliateId = detId("affiliate", "foodie_sarah", "tier_a");
    const linkId = detId("link", affiliateId, campaignId);
    const linkDoc = await db.collection('affiliateLinks').doc(linkId).get();
    
    if (!linkDoc.exists || linkDoc.data()?.status !== 'active') {
      throw new Error('Affiliate link not active');
    }
    
    const linkData = linkDoc.data();
    if (!linkData?.code || !linkData?.url) {
      throw new Error('Affiliate link missing code or URL');
    }
    capture.log('info', `✅ Affiliate link verified: ${linkData.code}`);

    // 6. Verify user redemption exists
    const userId = detId("user", "+15125550101");
    const couponId = detId("coupon", userId, campaignId, "redeemed");
    const couponDoc = await db.collection('coupons').doc(couponId).get();
    
    if (!couponDoc.exists || couponDoc.data()?.status !== 'redeemed') {
      throw new Error('Coupon not redeemed');
    }
    
    const couponData = couponDoc.data();
    if (!couponData?.redeemedAt || !couponData?.orderAmount) {
      throw new Error('Coupon missing redemption data');
    }
    capture.log('info', `✅ User redemption verified: $${couponData.orderAmount}`);

    // 7. Verify redemption record exists
    const redemptionId = detId("redemption", couponId);
    const redemptionDoc = await db.collection('redemptions').doc(redemptionId).get();
    
    if (!redemptionDoc.exists || redemptionDoc.data()?.status !== 'completed') {
      throw new Error('Redemption record not completed');
    }
    
    const redemptionData = redemptionDoc.data();
    if (!redemptionData?.affiliateEarning || redemptionData.affiliateEarning <= 0) {
      throw new Error('Affiliate earning not calculated');
    }
    capture.log('info', `✅ Redemption record verified: $${redemptionData.affiliateEarning} earned`);

    // 8. Verify payout is visible to affiliate
    const payoutId = detId("payout", affiliateId, "2025-01");
    const payoutDoc = await db.collection('payouts').doc(payoutId).get();
    
    if (!payoutDoc.exists) {
      throw new Error('Payout record not found');
    }
    
    const payoutData = payoutDoc.data();
    if (!payoutData?.totalEarnings || payoutData.totalEarnings <= 0) {
      throw new Error('Payout earnings not calculated');
    }
    capture.log('info', `✅ Payout visible: $${payoutData.totalEarnings} pending`);

    // 9. Verify affiliate link stats updated
    const updatedLinkDoc = await db.collection('affiliateLinks').doc(linkId).get();
    const updatedLinkData = updatedLinkDoc.data();
    
    if (updatedLinkData?.conversions !== 1) {
      throw new Error('Affiliate link conversion count not updated');
    }
    capture.log('info', '✅ Affiliate link stats updated');

    // 10. Test API endpoints return correct data
    // Note: In a real test, we'd make HTTP requests to the API endpoints
    // For now, we'll verify the data exists in Firestore

    // Verify business metrics would show the redemption
    const businessMetricsQuery = await db.collection('redemptions')
      .where('merchantId', '==', merchantId)
      .where('status', '==', 'completed')
      .get();
    
    if (businessMetricsQuery.empty) {
      throw new Error('Business metrics would not show redemptions');
    }
    capture.log('info', '✅ Business metrics data verified');

    // Verify affiliate metrics would show the earning
    const affiliateMetricsQuery = await db.collection('redemptions')
      .where('affiliateId', '==', affiliateId)
      .where('status', '==', 'completed')
      .get();
    
    if (affiliateMetricsQuery.empty) {
      throw new Error('Affiliate metrics would not show earnings');
    }
    capture.log('info', '✅ Affiliate metrics data verified');

    await capture.writeReceipts('smoke', 'Smoke-01', {
      ok: true,
      inputs: { journey: 'merchant→affiliate→user→redemption→payout' },
      outputs: {
        merchantApproved: true,
        campaignPublished: true,
        affiliateLinkActive: true,
        userRedeemed: true,
        payoutVisible: true,
        linkStatsUpdated: true,
        metricsDataReady: true
      }
    });

    capture.log('info', '🎉 Smoke-01 completed successfully!');

  } catch (error) {
    await capture.writeReceipts('smoke', 'Smoke-01', {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
