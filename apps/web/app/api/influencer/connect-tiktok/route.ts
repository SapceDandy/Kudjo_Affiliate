import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { TikTokConnectSchema, SocialMediaDataSchema } from '@/lib/schemas/social';
import { getCurrentUser } from '@/lib/auth-server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accessToken, openId } = TikTokConnectSchema.parse(body);

    // Fetch TikTok user data using TikTok API
    const tiktokResponse = await fetch(
      `https://open-api.tiktok.com/oauth/userinfo/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          open_id: openId,
          fields: ['open_id', 'username', 'display_name', 'avatar_url', 'follower_count', 'is_verified']
        })
      }
    );

    if (!tiktokResponse.ok) {
      return NextResponse.json(
        { error: { code: 'TIKTOK_API_ERROR', message: 'Failed to fetch TikTok data' } },
        { status: 400 }
      );
    }

    const tiktokData = await tiktokResponse.json();

    if (tiktokData.error) {
      return NextResponse.json(
        { error: { code: 'TIKTOK_API_ERROR', message: tiktokData.error.message } },
        { status: 400 }
      );
    }

    // Validate and structure social media data
    const socialMediaData = SocialMediaDataSchema.parse({
      platform: 'tiktok',
      username: tiktokData.data.username,
      followersCount: tiktokData.data.follower_count || 0,
      isVerified: tiktokData.data.is_verified || false,
      profilePicture: tiktokData.data.avatar_url,
      bio: tiktokData.data.display_name,
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });

    // Determine tier based on followers and verification
    let newTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
    const followers = socialMediaData.followersCount;
    
    if (socialMediaData.isVerified || followers >= 100000) {
      newTier = 'platinum';
    } else if (followers >= 50000) {
      newTier = 'gold';
    } else if (followers >= 10000) {
      newTier = 'silver';
    }

    // Get current influencer data
    const influencerRef = adminDb!.collection('influencers').doc(user.uid);
    const influencerDoc = await influencerRef.get();
    
    if (!influencerDoc.exists) {
      return NextResponse.json(
        { error: { code: 'INFLUENCER_NOT_FOUND', message: 'Influencer profile not found' } },
        { status: 404 }
      );
    }

    const currentData = influencerDoc.data();
    const previousTier = currentData?.tier || 'bronze';

    // Update influencer with social media data and new tier
    await influencerRef.update({
      socialMedia: {
        ...currentData?.socialMedia,
        tiktok: socialMediaData,
      },
      tier: newTier,
      updatedAt: new Date(),
    });

    // Log tier change if applicable
    if (previousTier !== newTier) {
      await adminDb!.collection('tierUpdates').add({
        influencerId: user.uid,
        previousTier,
        newTier,
        reason: `TikTok connection: ${followers} followers${socialMediaData.isVerified ? ', verified account' : ''}`,
        socialMediaData,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      socialMediaData,
      tierUpdate: previousTier !== newTier ? {
        previousTier,
        newTier,
        reason: `TikTok connection: ${followers} followers${socialMediaData.isVerified ? ', verified account' : ''}`,
      } : null,
    });

  } catch (error) {
    console.error('TikTok connect error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to connect TikTok account' } },
      { status: 500 }
    );
  }
}
