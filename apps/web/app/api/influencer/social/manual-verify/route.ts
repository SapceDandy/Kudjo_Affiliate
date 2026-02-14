import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

const ManualVerifySchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter']),
  handle: z.string().min(1),
  userId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, handle, userId } = ManualVerifySchema.parse(body);

    // Get current user session with flexible auth
    const user = await getCurrentUser(request);
    
    // Allow request if user matches or if no auth (development mode)
    if (user && user.uid !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await initializeFirebaseAdmin();

    // Check if user already has this platform verified
    const influencerRef = db.collection('influencers').doc(userId);
    const influencerDoc = await influencerRef.get();

    if (influencerDoc.exists) {
      const currentData = influencerDoc.data() || {};
      const socialAccounts = currentData.socialAccounts || [];
      
      // Check if platform is already verified
      const existingAccount = socialAccounts.find((acc: any) => acc.platform === platform && acc.verified);
      if (existingAccount) {
        return NextResponse.json({
          error: 'ALREADY_VERIFIED',
          message: `${platform} account is already verified`,
          existingAccount: {
            platform: existingAccount.platform,
            handle: existingAccount.handle,
            verifiedAt: existingAccount.verifiedAt
          }
        }, { status: 409 });
      }

      // Check if there's already a pending request for this platform
      const pendingVerifications = currentData.pendingVerifications || [];
      const existingPending = pendingVerifications.find((p: any) => p.platform === platform);
      if (existingPending) {
        return NextResponse.json({
          error: 'REQUEST_PENDING',
          message: `Verification request for ${platform} is already pending review`,
          pendingRequest: {
            platform,
            handle: existingPending.handle,
            requestedAt: existingPending.requestedAt
          }
        }, { status: 409 });
      }
    }

    // Check if there's already a verification request in the queue
    const verificationRequestRef = db.collection('socialVerificationRequests').doc(`${userId}_${platform}`);
    const existingRequest = await verificationRequestRef.get();
    
    if (existingRequest.exists) {
      const requestData = existingRequest.data();
      if (requestData?.status === 'pending') {
        return NextResponse.json({
          error: 'REQUEST_PENDING',
          message: `Verification request for ${platform} is already pending review`,
          pendingRequest: {
            platform,
            handle: requestData.handle,
            requestedAt: requestData.requestedAt
          }
        }, { status: 409 });
      }
    }

    // Create a manual verification request for admin review
    await verificationRequestRef.set({
      userId,
      platform,
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      requestedBy: userId,
    });

    // Update influencer document to mark verification as pending
    if (influencerDoc.exists) {
      const currentData = influencerDoc.data() || {};
      const pendingVerifications = currentData.pendingVerifications || [];
      
      // Add this platform to pending
      pendingVerifications.push({
        platform,
        handle: handle.startsWith('@') ? handle : `@${handle}`,
        requestedAt: new Date().toISOString(),
      });

      await influencerRef.update({
        pendingVerifications,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Manual verification request submitted successfully',
      platform,
      handle: handle.startsWith('@') ? handle : `@${handle}`,
    });
  } catch (error) {
    console.error('Manual verification error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
