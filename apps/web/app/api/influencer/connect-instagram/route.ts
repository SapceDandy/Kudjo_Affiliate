import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { InstagramConnectSchema, SocialMediaDataSchema } from '@/lib/schemas/social';
import { getCurrentUser } from '@/lib/auth-server';

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
    const { accessToken, userId } = InstagramConnectSchema.parse(body);

    // Fetch Instagram user data using Graph API
    const igResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,followers_count,is_verified,profile_picture_url,biography&access_token=${accessToken}`
    );

    if (!igResponse.ok) {
      return NextResponse.json(
        { error: { code: 'INSTAGRAM_API_ERROR', message: 'Failed to fetch Instagram data' } },
        { status: 400 }
      );
    }

    const igData = await igResponse.json();

    // Validate and structure social media data
    const socialMediaData = SocialMediaDataSchema.parse({
      platform: 'instagram',
      username: igData.username,
      followersCount: igData.followers_count,
      isVerified: igData.is_verified || false,
      profilePicture: igData.profile_picture_url,
      bio: igData.biography,
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
        instagram: socialMediaData,
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
        reason: `Instagram connection: ${followers} followers${socialMediaData.isVerified ? ', verified account' : ''}`,
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
        reason: `Instagram connection: ${followers} followers${socialMediaData.isVerified ? ', verified account' : ''}`,
      } : null,
    });

  } catch (error) {
    console.error('Instagram connect error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to connect Instagram account' } },
      { status: 500 }
    );
  }
}
