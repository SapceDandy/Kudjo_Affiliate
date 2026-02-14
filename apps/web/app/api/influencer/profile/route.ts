import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';

// Define schema inline to avoid import issues
const InfluencerSchema = z.object({
  ownerId: z.string(),
  handle: z.string().min(2),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  followerCount: z.number().int().nonnegative().default(0),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'Small', 'Medium', 'Large', 'XL', 'Huge']).default('bronze'),
  approved: z.boolean().default(false),
  socialAccounts: z.array(z.any()).default([]),
  hasVerifiedSocial: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const url = new URL(request.url);
    const uid = url.searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { error: { code: 'MISSING_UID', message: 'User ID is required' } },
        { status: 400 }
      );
    }

    const { db } = await initializeFirebaseAdmin();
    
    // Get influencer profile from Firestore
    const influencerDoc = await db.collection('influencers').doc(uid).get();
    
    if (!influencerDoc.exists) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Influencer profile not found' } },
        { status: 404 }
      );
    }

    const profileData = influencerDoc.data();
    
    // Log the raw data to debug the issue
    try {
      console.log('Raw profile data:', JSON.stringify(profileData, null, 2));
    } catch (logError) {
      console.log('Raw profile data (non-serializable)');
    }
    
    // Helper functions for social media data
    function extractSocialAccounts(data: any): any[] {
      const accounts: any[] = [];
      
      // Handle socialAccounts array format (new format)
      if (data?.socialAccounts && Array.isArray(data.socialAccounts)) {
        data.socialAccounts.forEach((account: any) => {
          if (account && typeof account === 'object') {
            accounts.push({
              platform: account.platform,
              handle: account.handle || account.username || `@${account.platform}_user`,
              followerCount: account.followerCount || account.followersCount || 0,
              verified: account.verified || account.isVerified || false,
              verifiedAt: account.verifiedAt || account.connectedAt || account.lastUpdated,
              profileUrl: account.profileUrl || account.profilePicture,
              bio: account.bio
            });
          }
        });
      }
      
      // Handle socialMedia object format (legacy format)
      if (data?.socialMedia) {
        Object.entries(data.socialMedia).forEach(([platform, socialData]: [string, any]) => {
          if (socialData && typeof socialData === 'object') {
            accounts.push({
              platform,
              handle: socialData.username || socialData.handle || `@${platform}_user`,
              followerCount: socialData.followersCount || socialData.followerCount || 0,
              verified: socialData.isVerified || false,
              verifiedAt: socialData.connectedAt || socialData.lastUpdated,
              profileUrl: socialData.profilePicture || socialData.profileUrl,
              bio: socialData.bio
            });
          }
        });
      }
      
      return accounts;
    }

    function hasSocialMediaConnected(data: any): boolean {
      // Check socialAccounts array format (new format)
      if (data?.socialAccounts && Array.isArray(data.socialAccounts) && data.socialAccounts.length > 0) {
        return true;
      }
      // Check socialMedia object format (legacy format)
      return Boolean(data?.socialMedia && Object.keys(data.socialMedia).length > 0);
    }

    // Transform and validate the data with safe defaults
    const transformedData = {
      ownerId: uid,
      handle: String(profileData?.handle || profileData?.displayName || 'user'),
      displayName: String(profileData?.displayName || profileData?.handle || 'User'),
      email: profileData?.email && profileData.email.trim() !== '' ? String(profileData.email) : undefined,
      followerCount: Number(profileData?.followerCount) || 0,
      tier: (profileData?.tier && ['bronze', 'silver', 'gold', 'platinum', 'Small', 'Medium', 'Large', 'XL', 'Huge'].includes(profileData.tier)) ? profileData.tier : 'bronze',
      approved: Boolean(profileData?.approved || profileData?.status === 'approved'),
      socialAccounts: extractSocialAccounts(profileData),
      hasVerifiedSocial: Boolean(profileData?.hasVerifiedSocial || hasSocialMediaConnected(profileData) || profileData?.status === 'approved'),
      createdAt: profileData?.createdAt ? (profileData.createdAt._seconds ? new Date(profileData.createdAt._seconds * 1000).toISOString() : String(profileData.createdAt)) : new Date().toISOString(),
      updatedAt: profileData?.updatedAt ? (typeof profileData.updatedAt === 'string' ? profileData.updatedAt : new Date().toISOString()) : new Date().toISOString(),
    };

    console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

    // Validate the transformed data
    const validatedProfile = InfluencerSchema.safeParse(transformedData);

    if (!validatedProfile.success) {
      return NextResponse.json(
        {
          error: {
            code: 'PROFILE_VALIDATION_FAILED',
            message: 'Influencer profile data is invalid',
            issues: validatedProfile.error.issues
          }
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: validatedProfile.data
    });

  } catch (error) {
    console.error('Error fetching influencer profile:', error);
    
    if (error instanceof Error && error.message.includes('Firebase Admin')) {
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const url = new URL(request.url);
    const uid = url.searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { error: { code: 'MISSING_UID', message: 'User ID is required' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { db } = await initializeFirebaseAdmin();
    
    // Validate update data
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined values to prevent Firestore errors
    const sanitizedData = JSON.parse(JSON.stringify(updateData));
    
    await db.collection('influencers').doc(uid).update(sanitizedData);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating influencer profile:', error);
    
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: 'Failed to update profile' } },
      { status: 500 }
    );
  }
}
