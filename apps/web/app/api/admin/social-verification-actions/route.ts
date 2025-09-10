import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { SocialVerificationActionSchema } from '@/lib/schemas/social-verification';

function getTierFromFollowerCount(count: number): string {
  if (count >= 1000000) return 'Huge';
  if (count >= 250000) return 'XL';
  if (count >= 50000) return 'Large';
  if (count >= 5000) return 'Medium';
  return 'Small';
}

// Utility function to sanitize data for Firestore (removes undefined values)
function sanitizeForFirestore(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuth(request);
    
    // Verify admin access
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requestId, action, adminId, message, followerCount } = SocialVerificationActionSchema.parse(body);
    
    if (!adminDb) {
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Database not available' } },
        { status: 500 }
      );
    }
    
    // Get the social verification request
    const requestRef = adminDb.collection('socialVerificationRequests').doc(requestId);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: { code: 'REQUEST_NOT_FOUND', message: 'Social verification request not found' } },
        { status: 404 }
      );
    }

    const requestData = requestDoc.data();
    const userId = requestData?.userId;
    const platform = requestData?.platform;
    const handle = requestData?.handle;

    if (!userId || !platform || !handle) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Invalid request data' } },
        { status: 400 }
      );
    }

    // Get the influencer document
    const influencerRef = adminDb.collection('influencers').doc(userId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Influencer not found' } },
        { status: 404 }
      );
    }

    const currentData = influencerDoc.data() || {};
    const timestamp = new Date().toISOString();

    if (action === 'approve') {
      // Add verified social account
      const currentSocialAccounts = currentData.socialAccounts || [];
      
      // Build social account object, only including defined values
      const socialAccount: any = {
        platform,
        handle: handle.replace('@', ''),
        followerCount: followerCount || 0,
        verified: true,
        verifiedAt: timestamp,
        verifiedBy: adminId,
      };
      
      // Only add profileUrl and avatarUrl if they exist
      if (requestData?.profileUrl) {
        socialAccount.profileUrl = requestData.profileUrl;
      }
      if (requestData?.avatarUrl) {
        socialAccount.avatarUrl = requestData.avatarUrl;
      }
      
      const updatedSocialAccounts = [
        ...currentSocialAccounts.filter((acc: any) => acc.platform !== platform),
        socialAccount,
      ];

      // Calculate total follower count and determine tier
      const totalFollowers = updatedSocialAccounts.reduce(
        (sum: number, acc: any) => sum + (acc.followerCount || 0),
        0
      );
      const tier = getTierFromFollowerCount(totalFollowers);

      // Prepare update data and sanitize for Firestore
      const updateData = sanitizeForFirestore({
        socialAccounts: updatedSocialAccounts,
        hasVerifiedSocial: true,
        followerCount: totalFollowers,
        tier,
        approved: true,
        approvalStatus: 'approved',
        isActive: true,
        isVisible: true,
        updatedAt: timestamp,
        // Remove from pending verifications
        pendingVerifications: (currentData.pendingVerifications || []).filter(
          (p: any) => p.platform !== platform
        ),
      });

      // Update influencer with verified social account and full activation
      console.log('Updating influencer profile with data:', JSON.stringify(updateData, null, 2));
      await influencerRef.update(updateData);
      console.log('Influencer profile updated successfully');

      // Update the request status
      const requestUpdateData = sanitizeForFirestore({
        status: 'approved',
        processedAt: timestamp,
        processedBy: adminId,
        adminMessage: message || 'Social verification approved',
      });
      console.log('Updating request status with data:', JSON.stringify(requestUpdateData, null, 2));
      await requestRef.update(requestUpdateData);
      console.log('Request status updated successfully');

      return NextResponse.json({
        success: true,
        message: 'Social verification approved and user activated',
        action: 'approved',
        userId,
        platform,
      });

    } else if (action === 'reject') {
      // Update the request status
      const requestUpdateData = sanitizeForFirestore({
        status: 'rejected',
        processedAt: timestamp,
        processedBy: adminId,
        adminMessage: message || 'Social verification rejected',
      });
      await requestRef.update(requestUpdateData);

      // Remove from pending verifications
      const influencerUpdateData = sanitizeForFirestore({
        pendingVerifications: (currentData.pendingVerifications || []).filter(
          (p: any) => p.platform !== platform
        ),
        updatedAt: timestamp,
      });
      await influencerRef.update(influencerUpdateData);

      return NextResponse.json({
        success: true,
        message: 'Social verification rejected',
        action: 'rejected',
        userId,
        platform,
      });

    } else if (action === 'need_more_info') {
      // Update the request status
      const requestUpdateData = sanitizeForFirestore({
        status: 'need_more_info',
        processedAt: timestamp,
        processedBy: adminId,
        adminMessage: message || 'More information needed for verification',
      });
      await requestRef.update(requestUpdateData);

      return NextResponse.json({
        success: true,
        message: 'Requested more information from user',
        action: 'need_more_info',
        userId,
        platform,
      });
    }

    return NextResponse.json(
      { error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing social verification action:', error);
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: (error as any).issues } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process social verification action' } },
      { status: 500 }
    );
  }
}
