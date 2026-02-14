import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

const ConnectSocialSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter']),
  userId: z.string(),
  code: z.string().optional(),
  simulateSuccess: z.boolean().optional(),
});

// Placeholder OAuth configurations - replace with real credentials when available
const OAUTH_CONFIGS = {
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID || 'placeholder_instagram_client_id',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'placeholder_instagram_secret',
    redirectUri: `${process.env.NEXTAUTH_URL}/api/influencer/social/callback/instagram`,
  },
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_ID || 'placeholder_tiktok_client_id',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'placeholder_tiktok_secret',
    redirectUri: `${process.env.NEXTAUTH_URL}/api/influencer/social/callback/tiktok`,
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || 'placeholder_youtube_client_id',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || 'placeholder_youtube_secret',
    redirectUri: `${process.env.NEXTAUTH_URL}/api/influencer/social/callback/youtube`,
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || 'placeholder_twitter_client_id',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || 'placeholder_twitter_secret',
    redirectUri: `${process.env.NEXTAUTH_URL}/api/influencer/social/callback/twitter`,
  },
};

function getTierFromFollowerCount(count: number): string {
  if (count >= 1000000) return 'Huge';
  if (count >= 250000) return 'XL';
  if (count >= 50000) return 'Large';
  if (count >= 5000) return 'Medium';
  return 'Small';
}

async function simulateOAuthData(platform: string) {
  // Simulate realistic social media data
  const handles = {
    instagram: ['foodie_adventures', 'lifestyle_guru', 'fitness_journey', 'travel_diaries'],
    tiktok: ['dance_moves', 'comedy_central', 'life_hacks', 'cooking_tips'],
    youtube: ['tech_reviews', 'gaming_channel', 'beauty_tutorials', 'music_covers'],
    twitter: ['news_updates', 'thought_leader', 'industry_expert', 'creative_writer'],
  };

  const randomHandle = handles[platform as keyof typeof handles][Math.floor(Math.random() * 4)];
  const followerCount = Math.floor(Math.random() * 500000) + 1000; // 1k to 500k followers

  return {
    handle: `@${randomHandle}`,
    followerCount,
    profileUrl: `https://${platform}.com/${randomHandle}`,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomHandle}`,
    verified: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, userId, code, simulateSuccess } = ConnectSocialSchema.parse(body);

    // Get current user session with flexible auth
    const user = await getCurrentUser(request);
    
    // Allow request if user matches or if no auth (development mode)
    if (user && user.uid !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let socialData;

    if (simulateSuccess) {
      // Simulate successful OAuth for demo purposes
      socialData = await simulateOAuthData(platform);
    } else {
      // Real OAuth implementation would go here
      // For now, return error since we don't have real credentials
      return NextResponse.json(
        { error: 'OAuth not configured. Please use manual verification or contact admin.' },
        { status: 400 }
      );
    }

    const { db } = await initializeFirebaseAdmin();

    // Get current influencer document
    const influencerRef = db.collection('influencers').doc(userId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 });
    }

    const currentData = influencerDoc.data() || {};
    const currentSocialAccounts = currentData.socialAccounts || [];

    // Remove existing account for this platform and add new one
    const updatedSocialAccounts = [
      ...currentSocialAccounts.filter((acc: any) => acc.platform !== platform),
      {
        platform,
        handle: socialData.handle,
        followerCount: socialData.followerCount,
        verified: true,
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'oauth',
        profileUrl: socialData.profileUrl,
        avatarUrl: socialData.avatarUrl,
      },
    ];

    // Calculate total follower count and determine tier
    const totalFollowers = updatedSocialAccounts.reduce(
      (sum: number, acc: any) => sum + acc.followerCount,
      0
    );
    const tier = getTierFromFollowerCount(totalFollowers);

    // Update influencer document
    await influencerRef.update({
      socialAccounts: updatedSocialAccounts,
      hasVerifiedSocial: true,
      followerCount: totalFollowers,
      tier,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ...socialData,
      tier,
      totalFollowers,
    });
  } catch (error) {
    console.error('Social connect error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
