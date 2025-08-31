import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const requestSchema = z.object({
  influencerId: z.string().min(1),
  platform: z.enum(['instagram', 'tiktok', 'youtube']),
  followerCount: z.number().min(0),
  isVerified: z.boolean().default(false),
  engagementRate: z.number().min(0).max(100).optional()
});

// Tier thresholds based on follower count
const TIER_THRESHOLDS = {
  'S': { min: 1000, max: 9999, label: 'Nano (1K-10K)' },
  'M': { min: 10000, max: 99999, label: 'Micro (10K-100K)' },
  'L': { min: 100000, max: 999999, label: 'Macro (100K-1M)' },
  'XL': { min: 1000000, max: 9999999, label: 'Mega (1M-10M)' },
  'Huge': { min: 10000000, max: Infinity, label: 'Celebrity (10M+)' }
};

function calculateTier(followerCount: number, isVerified: boolean, engagementRate?: number): string {
  // Base tier calculation
  let tier = 'S';
  for (const [tierKey, threshold] of Object.entries(TIER_THRESHOLDS)) {
    if (followerCount >= threshold.min && followerCount <= threshold.max) {
      tier = tierKey;
      break;
    }
  }

  // Verification bonus - can bump up one tier if close to threshold
  if (isVerified && tier !== 'Huge') {
    const currentThreshold = TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS];
    const nextTierKeys = Object.keys(TIER_THRESHOLDS);
    const currentIndex = nextTierKeys.indexOf(tier);
    
    if (currentIndex < nextTierKeys.length - 1) {
      const nextTier = nextTierKeys[currentIndex + 1];
      const nextThreshold = TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS];
      
      // If within 20% of next tier threshold and verified, upgrade
      if (followerCount >= currentThreshold.max * 0.8) {
        tier = nextTier;
      }
    }
  }

  // High engagement bonus (>5% can bump up if close to threshold)
  if (engagementRate && engagementRate > 5 && tier !== 'Huge') {
    const currentThreshold = TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS];
    const nextTierKeys = Object.keys(TIER_THRESHOLDS);
    const currentIndex = nextTierKeys.indexOf(tier);
    
    if (currentIndex < nextTierKeys.length - 1 && followerCount >= currentThreshold.max * 0.9) {
      const nextTier = nextTierKeys[currentIndex + 1];
      tier = nextTier;
    }
  }

  return tier;
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('influencer', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { influencerId, platform, followerCount, isVerified, engagementRate } = requestSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify influencer ownership for non-admin users
    if (authResult.user.role === 'influencer' && authResult.user.influencerId !== influencerId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get current influencer data
    const influencerRef = adminDb.collection('influencers').doc(influencerId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    const influencer = influencerDoc.data()!;
    const currentTier = influencer.tier || 'S';

    // Calculate new tier
    const newTier = calculateTier(followerCount, isVerified, engagementRate);
    const now = new Date();

    // Update social media data
    const socialMediaData = influencer.socialMedia || {};
    socialMediaData[platform] = {
      followerCount,
      isVerified,
      engagementRate: engagementRate || null,
      lastUpdated: now,
      connectedAt: socialMediaData[platform]?.connectedAt || now
    };

    // Find highest follower count across all platforms for tier calculation
    const allFollowerCounts = Object.values(socialMediaData)
      .map((data: any) => data.followerCount || 0);
    const maxFollowerCount = Math.max(...allFollowerCounts, followerCount);
    const hasVerification = Object.values(socialMediaData)
      .some((data: any) => data.isVerified);
    const avgEngagement = Object.values(socialMediaData)
      .filter((data: any) => data.engagementRate)
      .reduce((sum: number, data: any, _, arr) => sum + (data.engagementRate || 0) / arr.length, 0);

    // Recalculate tier based on best metrics across all platforms
    const finalTier = calculateTier(maxFollowerCount, hasVerification, avgEngagement || undefined);

    // Update influencer document
    const updateData: any = {
      socialMedia: socialMediaData,
      followerCount: maxFollowerCount, // Store highest count
      tier: finalTier,
      updatedAt: now
    };

    // Log tier change if it occurred
    let tierChanged = false;
    if (currentTier !== finalTier) {
      tierChanged = true;
      updateData.tierHistory = [
        ...(influencer.tierHistory || []),
        {
          fromTier: currentTier,
          toTier: finalTier,
          reason: 'social_media_update',
          platform,
          followerCount,
          isVerified,
          engagementRate,
          changedAt: now
        }
      ];
    }

    await influencerRef.update(updateData);

    // Log the tier upgrade if it happened
    if (tierChanged) {
      await adminDb.collection('tierUpgrades').add({
        influencerId,
        fromTier: currentTier,
        toTier: finalTier,
        platform,
        followerCount,
        isVerified,
        engagementRate: engagementRate || null,
        upgradeReason: 'social_media_verification',
        performedAt: now,
        performedBy: authResult.user.uid
      });
    }

    return NextResponse.json({
      success: true,
      influencerId,
      platform,
      previousTier: currentTier,
      newTier: finalTier,
      tierChanged,
      followerCount: maxFollowerCount,
      tierLabel: TIER_THRESHOLDS[finalTier as keyof typeof TIER_THRESHOLDS]?.label,
      socialMediaData: {
        [platform]: socialMediaData[platform]
      }
    });

  } catch (error) {
    console.error('Error updating influencer tier:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update tier', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
