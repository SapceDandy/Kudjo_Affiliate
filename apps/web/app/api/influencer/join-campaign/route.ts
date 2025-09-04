import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { JoinCampaignSchema } from '@/lib/schemas/coupon';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = JoinCampaignSchema.parse(body);
    const { offerId, infId, legalAccepted } = parsed;

    // Verify offer exists and is active
    const offerDoc = await adminDb!.collection('offers').doc(offerId).get();
    if (!offerDoc.exists) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const offerData = offerDoc.data()!;
    if (!offerData.active) {
      return NextResponse.json({ error: 'Offer is not active' }, { status: 400 });
    }

    // Verify influencer exists and get tier
    const influencerDoc = await adminDb!.collection('influencers').doc(infId).get();
    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    const influencerData = influencerDoc.data()!;
    const influencerTier = influencerData.tier || 'S';

    // Check if influencer is eligible for this offer
    if (offerData.eligibility?.tiers && !offerData.eligibility.tiers.includes(influencerTier)) {
      return NextResponse.json({ error: 'Not eligible for this offer' }, { status: 403 });
    }

    // Check if offer has reached max influencers
    if (offerData.maxInfluencers) {
      const currentInfluencers = await adminDb!.collection('coupons')
        .where('offerId', '==', offerId)
        .where('type', '==', 'AFFILIATE')
        .where('status', '==', 'active')
        .get();
      
      if (currentInfluencers.size >= offerData.maxInfluencers) {
        return NextResponse.json({ error: 'Campaign is full' }, { status: 400 });
      }
    }

    // Check cooldown period
    const cooldownDays = offerData.cooldownDays || 7;
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

    const recentCoupons = await adminDb!.collection('coupons')
      .where('infId', '==', infId)
      .where('bizId', '==', offerData.bizId)
      .where('createdAt', '>', cooldownDate)
      .get();

    if (recentCoupons.size > 0) {
      return NextResponse.json({ 
        error: `Must wait ${cooldownDays} days between campaigns from this business` 
      }, { status: 400 });
    }

    const now = new Date();
    const deadlineDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

    // Generate codes
    const affiliateCode = `AF-${nanoid(8).toUpperCase()}`;
    const contentCode = `CM-${nanoid(8).toUpperCase()}`;

    // Create affiliate link
    const linkId = nanoid(12);
    const linkUrl = `${process.env.NEXTAUTH_URL}/r/${linkId}`;

    // Generate QR codes
    const affiliateQR = await QRCode.toDataURL(linkUrl);
    const contentQR = await QRCode.toDataURL(contentCode);

    // Create both coupons in a batch
    const batch = adminDb!.batch();

    // Affiliate coupon
    const affiliateCouponRef = adminDb!.collection('coupons').doc();
    batch.set(affiliateCouponRef, {
      type: 'AFFILIATE',
      bizId: offerData.bizId,
      infId,
      offerId,
      linkId,
      code: affiliateCode,
      status: 'active',
      deadlineAt: deadlineDate,
      admin: { posAdded: false },
      createdAt: now,
      updatedAt: now,
    });

    // Content meal coupon
    const contentCouponRef = adminDb!.collection('coupons').doc();
    batch.set(contentCouponRef, {
      type: 'CONTENT_MEAL',
      bizId: offerData.bizId,
      infId,
      offerId,
      code: contentCode,
      status: 'active',
      deadlineAt: deadlineDate,
      admin: { posAdded: false },
      createdAt: now,
      updatedAt: now,
    });

    // Create affiliate link record
    const affiliateLinkRef = adminDb!.collection('affiliateLinks').doc(linkId);
    batch.set(affiliateLinkRef, {
      linkId,
      infId,
      bizId: offerData.bizId,
      offerId,
      couponId: affiliateCouponRef.id,
      url: linkUrl,
      clicks: 0,
      conversions: 0,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      coupons: {
        affiliate: {
          id: affiliateCouponRef.id,
          code: affiliateCode,
          qrUrl: affiliateQR,
          linkId,
          linkUrl,
        },
        contentMeal: {
          id: contentCouponRef.id,
          code: contentCode,
          qrUrl: contentQR,
        },
      },
      deadlines: {
        postWithin: '7 days',
        keepPosted: '7-14 days',
      },
    });

  } catch (error) {
    console.error('Error joining campaign:', error);
    return NextResponse.json(
      { error: 'Failed to join campaign' },
      { status: 500 }
    );
  }
}
