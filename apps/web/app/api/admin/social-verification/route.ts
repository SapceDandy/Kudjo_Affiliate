import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';

const AdminVerifySchema = z.object({
  userId: z.string(),
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter']),
  handle: z.string(),
  followerCount: z.number().int().nonnegative(),
  approved: z.boolean(),
  profileUrl: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
});

function getTierFromFollowerCount(count: number): string {
  if (count >= 1000000) return 'Huge';
  if (count >= 250000) return 'XL';
  if (count >= 50000) return 'Large';
  if (count >= 5000) return 'Medium';
  return 'Small';
}

// GET - List pending verification requests
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const requestsRef = adminDb.collection('socialVerificationRequests');
    const snapshot = await requestsRef.get();
    
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get verification requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Admin approve/reject verification
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, platform, handle, followerCount, approved, profileUrl, avatarUrl } = AdminVerifySchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const influencerRef = adminDb.collection('influencers').doc(userId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    const currentData = influencerDoc.data() || {};

    if (approved) {
      // Add verified social account
      const currentSocialAccounts = currentData.socialAccounts || [];
      const updatedSocialAccounts = [
        ...currentSocialAccounts.filter((acc: any) => acc.platform !== platform),
        {
          platform,
          handle,
          followerCount,
          verified: true,
          verifiedAt: new Date().toISOString(),
          verifiedBy: 'admin',
          profileUrl,
          avatarUrl,
        },
      ];

      // Calculate total follower count and determine tier
      const totalFollowers = updatedSocialAccounts.reduce(
        (sum: number, acc: any) => sum + acc.followerCount,
        0
      );
      const tier = getTierFromFollowerCount(totalFollowers);

      await influencerRef.update({
        socialAccounts: updatedSocialAccounts,
        hasVerifiedSocial: true,
        followerCount: totalFollowers,
        tier,
        updatedAt: new Date().toISOString(),
        // Remove from pending verifications
        pendingVerifications: (currentData.pendingVerifications || []).filter(
          (p: any) => p.platform !== platform
        ),
      });
    } else {
      // Just remove from pending verifications
      await influencerRef.update({
        pendingVerifications: (currentData.pendingVerifications || []).filter(
          (p: any) => p.platform !== platform
        ),
        updatedAt: new Date().toISOString(),
      });
    }

    // Delete the verification request
    const requestRef = adminDb.collection('socialVerificationRequests').doc(`${userId}_${platform}`);
    await requestRef.delete();

    return NextResponse.json({
      success: true,
      approved,
      message: approved ? 'Account verified successfully' : 'Verification request rejected',
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
