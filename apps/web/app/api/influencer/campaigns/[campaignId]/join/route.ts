import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const requestSchema = z.object({
  influencerId: z.string().min(1),
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: "Terms must be accepted"
  })
});

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const authResult = await requireRole('influencer', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { campaignId } = params;
    const body = await request.json();
    const { influencerId, acceptedTerms } = requestSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get the campaign
    const campaignDoc = await adminDb!.collection('offers').doc(campaignId).get();
    if (!campaignDoc.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaignDoc.data()!;

    // Check if campaign is active
    if (campaign.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }

    // Check if campaign has expired
    const now = new Date();
    const endDate = campaign.endAt?.toDate();
    if (endDate && endDate < now) {
      return NextResponse.json({ error: 'Campaign has expired' }, { status: 400 });
    }

    // Get influencer data
    const influencerDoc = await adminDb!.collection('influencers').doc(influencerId).get();
    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    const influencer = influencerDoc.data()!;

    // Check tier eligibility
    const requiredTiers = campaign.eligibleTiers || ['S', 'M', 'L', 'XL', 'Huge'];
    if (!requiredTiers.includes(influencer.tier || 'S')) {
      return NextResponse.json({ error: 'Not eligible for this campaign tier' }, { status: 403 });
    }

    // Check if already joined
    const existingCouponQuery = await adminDb!.collection('coupons')
      .where('offerId', '==', campaignId)
      .where('influencerId', '==', influencerId)
      .where('type', '==', 'AFFILIATE')
      .get();

    if (!existingCouponQuery.empty) {
      return NextResponse.json({ error: 'Already joined this campaign' }, { status: 400 });
    }

    // Check cooldown period (24 hours between joins)
    const cooldownHours = 24;
    const cooldownDate = new Date(now.getTime() - (cooldownHours * 60 * 60 * 1000));
    
    const recentCouponsQuery = await adminDb!.collection('coupons')
      .where('influencerId', '==', influencerId)
      .where('createdAt', '>=', cooldownDate)
      .get();

    if (recentCouponsQuery.size >= 3) { // Max 3 joins per 24 hours
      return NextResponse.json({ 
        error: 'Too many recent campaign joins. Please wait before joining another campaign.' 
      }, { status: 429 });
    }

    // Generate unique coupon codes
    const generateCouponCode = (type: string) => {
      const prefix = type === 'AFFILIATE' ? 'AFF' : 'MEAL';
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `${prefix}${influencerId.substring(0, 4).toUpperCase()}${random}`;
    };

    const affiliateCode = generateCouponCode('AFFILIATE');
    const contentCode = generateCouponCode('CONTENT');

    // Create both coupons atomically
    const batch = adminDb!.batch();

    // Affiliate coupon
    const affiliateCouponRef = adminDb!.collection('coupons').doc();
    batch.set(affiliateCouponRef, {
      id: affiliateCouponRef.id,
      code: affiliateCode,
      type: 'AFFILIATE',
      offerId: campaignId,
      influencerId,
      businessId: campaign.bizId,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue,
      splitPct: campaign.splitPct || 20,
      status: 'active',
      createdAt: now,
      expiresAt: endDate || new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days default
      usageCount: 0,
      maxUses: campaign.maxUsesPerInfluencer || 100,
      termsAcceptedAt: now
    });

    // Content meal coupon
    const contentCouponRef = adminDb!.collection('coupons').doc();
    batch.set(contentCouponRef, {
      id: contentCouponRef.id,
      code: contentCode,
      type: 'CONTENT_MEAL',
      offerId: campaignId,
      influencerId,
      businessId: campaign.bizId,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue,
      splitPct: 0, // No earnings for content meal
      status: 'active',
      createdAt: now,
      expiresAt: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)), // 7 days for content meal
      usageCount: 0,
      maxUses: 1, // Single use for content meal
      termsAcceptedAt: now,
      contentDeadline: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)) // Must post within 7 days
    });

    // Log the join action
    const joinLogRef = adminDb!.collection('campaignJoins').doc();
    batch.set(joinLogRef, {
      campaignId,
      influencerId,
      joinedAt: now,
      affiliateCouponId: affiliateCouponRef.id,
      contentCouponId: contentCouponRef.id,
      termsAccepted: acceptedTerms,
      influencerTier: influencer.tier || 'S'
    });

    // Update campaign stats
    const campaignRef = adminDb!.collection('offers').doc(campaignId);
    batch.update(campaignRef, {
      activeInfluencers: (campaign.activeInfluencers || 0) + 1,
      updatedAt: now
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Successfully joined campaign',
      coupons: {
        affiliate: {
          id: affiliateCouponRef.id,
          code: affiliateCode,
          type: 'AFFILIATE',
          expiresAt: endDate?.toISOString()
        },
        contentMeal: {
          id: contentCouponRef.id,
          code: contentCode,
          type: 'CONTENT_MEAL',
          expiresAt: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
          contentDeadline: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error joining campaign:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to join campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
