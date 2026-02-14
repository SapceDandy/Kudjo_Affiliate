import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { RejectActionSchema } from '@/lib/schemas/admin';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    // Verify admin access
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, userType, adminId, reason } = RejectActionSchema.parse(body);
    
    const { db } = await initializeFirebaseAdmin();
    
    // Get the collection based on user type
    const collection = userType === 'business' ? 'businesses' : 'influencers';
    const userRef = db.collection(collection).doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: `${userType} not found` } },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentHistory = userData?.approvalHistory || [];
    
    // Check if user already has a pending approval request being processed
    if (userData?.approvalStatus === 'processing') {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_REQUEST', message: 'This user already has an approval request being processed' } },
        { status: 409 }
      );
    }
    
    // Check if user is already rejected and still in cooldown
    if (userData?.approvalStatus === 'rejected' && userData?.canReapplyAt) {
      const canReapplyDate = new Date(userData.canReapplyAt);
      if (canReapplyDate > new Date()) {
        return NextResponse.json(
          { error: { code: 'ALREADY_REJECTED', message: `This user was recently rejected and can reapply after ${canReapplyDate.toISOString()}` } },
          { status: 409 }
        );
      }
    }
    
    // Calculate reapply date (24 hours from now)
    const canReapplyAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Add rejection to history
    const rejectionEntry = {
      status: 'rejected' as const,
      timestamp: new Date().toISOString(),
      adminId,
      reason,
    };

    // First mark as processing to prevent duplicate requests
    await userRef.update({
      approvalStatus: 'processing',
      updatedAt: new Date().toISOString(),
    });
    
    // Update user with rejection
    const updateData = {
      approved: false,
      approvalStatus: 'rejected' as const,
      approvalHistory: [...currentHistory, rejectionEntry],
      canReapplyAt,
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined values
    const sanitizedData = JSON.parse(JSON.stringify(updateData));
    
    try {
      await userRef.update(sanitizedData);
    } catch (updateError) {
      // Rollback processing state on error
      await userRef.update({
        approvalStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });
      throw updateError;
    }

    // Send email notification (placeholder for now)
    console.log(`📧 Email notification: ${userType} ${userId} rejected by admin ${adminId}. Reason: ${reason}`);
    
    return NextResponse.json({
      success: true,
      message: `${userType} rejected successfully`,
      userId,
      rejectionEntry,
      canReapplyAt,
    });

  } catch (error) {
    console.error('Error rejecting user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to reject user' } },
      { status: 500 }
    );
  }
}
