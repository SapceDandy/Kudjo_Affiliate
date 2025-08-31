import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
  influencerId: z.string().min(1),
  campaignId: z.string().min(1)
});

export async function GET(request: NextRequest) {
  const authResult = await requireRole('influencer', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { influencerId, campaignId } = querySchema.parse({
      influencerId: searchParams.get('influencerId'),
      campaignId: searchParams.get('campaignId')
    });

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify influencer ownership for non-admin users
    if (authResult.user.role === 'influencer' && authResult.user.influencerId !== influencerId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get influencer and campaign data
    const [influencerDoc, campaignDoc] = await Promise.all([
      adminDb.collection('influencers').doc(influencerId).get(),
      adminDb.collection('offers').doc(campaignId).get()
    ]);

    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    if (!campaignDoc.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const influencer = influencerDoc.data()!;
    const campaign = campaignDoc.data()!;

    const eligibilityChecks = {
      tierEligible: false,
      campaignActive: false,
      notExpired: false,
      notAlreadyJoined: false,
      withinInfluencerLimit: false,
      passedCooldown: false,
      meetsMinFollowers: false
    };

    const issues: string[] = [];

    // Check tier eligibility
    const influencerTier = influencer.tier || 'S';
    const eligibleTiers = campaign.eligibleTiers || ['S', 'M', 'L', 'XL', 'Huge'];
    eligibilityChecks.tierEligible = eligibleTiers.includes(influencerTier);
    if (!eligibilityChecks.tierEligible) {
      issues.push(`Tier ${influencerTier} not eligible. Required: ${eligibleTiers.join(', ')}`);
    }

    // Check campaign status
    eligibilityChecks.campaignActive = campaign.status === 'active';
    if (!eligibilityChecks.campaignActive) {
      issues.push(`Campaign is ${campaign.status || 'inactive'}`);
    }

    // Check expiration
    const now = new Date();
    const endDate = campaign.endAt?.toDate();
    eligibilityChecks.notExpired = !endDate || endDate > now;
    if (!eligibilityChecks.notExpired) {
      issues.push('Campaign has expired');
    }

    // Check if already joined
    const existingCouponQuery = await adminDb.collection('coupons')
      .where('offerId', '==', campaignId)
      .where('influencerId', '==', influencerId)
      .where('type', '==', 'AFFILIATE')
      .get();

    eligibilityChecks.notAlreadyJoined = existingCouponQuery.empty;
    if (!eligibilityChecks.notAlreadyJoined) {
      issues.push('Already joined this campaign');
    }

    // Check influencer limit
    const maxInfluencers = campaign.maxInfluencers || 100;
    const activeInfluencers = campaign.activeInfluencers || 0;
    eligibilityChecks.withinInfluencerLimit = activeInfluencers < maxInfluencers;
    if (!eligibilityChecks.withinInfluencerLimit) {
      issues.push(`Campaign full (${activeInfluencers}/${maxInfluencers} influencers)`);
    }

    // Check cooldown (24 hours between joins)
    const cooldownHours = 24;
    const cooldownDate = new Date(now.getTime() - (cooldownHours * 60 * 60 * 1000));
    
    const recentCouponsQuery = await adminDb.collection('coupons')
      .where('influencerId', '==', influencerId)
      .where('createdAt', '>=', cooldownDate)
      .get();

    const recentJoins = recentCouponsQuery.size;
    const maxRecentJoins = 3; // Max 3 joins per 24 hours
    eligibilityChecks.passedCooldown = recentJoins < maxRecentJoins;
    if (!eligibilityChecks.passedCooldown) {
      issues.push(`Too many recent joins (${recentJoins}/${maxRecentJoins} in 24h). Next available: ${new Date(cooldownDate.getTime() + (24 * 60 * 60 * 1000)).toLocaleString()}`);
    }

    // Check minimum follower requirement (if campaign has one)
    const minFollowers = campaign.minFollowers || 0;
    const influencerFollowers = influencer.followerCount || 0;
    eligibilityChecks.meetsMinFollowers = influencerFollowers >= minFollowers;
    if (!eligibilityChecks.meetsMinFollowers) {
      issues.push(`Need ${minFollowers.toLocaleString()} followers (have ${influencerFollowers.toLocaleString()})`);
    }

    // Overall eligibility
    const isEligible = Object.values(eligibilityChecks).every(check => check === true);

    // Calculate potential earnings
    const estimatedOrderValue = campaign.averageOrderValue || 5000; // $50 default
    const splitPct = campaign.splitPct || 20;
    const potentialEarnings = Math.round((estimatedOrderValue * (splitPct / 100)) / 100 * 100) / 100;

    return NextResponse.json({
      eligible: isEligible,
      influencerId,
      campaignId,
      influencerTier,
      checks: eligibilityChecks,
      issues,
      campaignInfo: {
        title: campaign.title,
        businessName: campaign.businessName,
        discountType: campaign.discountType,
        discountValue: campaign.discountValue,
        splitPercentage: campaign.splitPct || 20,
        endDate: endDate?.toISOString(),
        activeInfluencers: campaign.activeInfluencers || 0,
        maxInfluencers: campaign.maxInfluencers || 100
      },
      earnings: {
        splitPercentage: splitPct,
        estimatedEarningsPerSale: potentialEarnings,
        maxUsesPerInfluencer: campaign.maxUsesPerInfluencer || 50
      },
      nextEligibleAt: !eligibilityChecks.passedCooldown ? 
        new Date(cooldownDate.getTime() + (24 * 60 * 60 * 1000)).toISOString() : null
    });

  } catch (error) {
    console.error('Error checking eligibility:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check eligibility', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
