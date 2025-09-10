import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { ApprovalActionSchema } from '@/lib/schemas/admin';

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
    const { userId, userType, adminId, reason } = ApprovalActionSchema.parse(body);
    
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
    
    // Check if user is already approved
    if (userData?.approvalStatus === 'approved' && userData?.approved === true) {
      return NextResponse.json(
        { error: { code: 'ALREADY_APPROVED', message: 'This user is already approved' } },
        { status: 409 }
      );
    }
    
    // Add approval to history
    const approvalEntry = {
      status: 'approved' as const,
      timestamp: new Date().toISOString(),
      adminId,
      reason: reason || 'Approved by admin',
    };

    // First mark as processing to prevent duplicate requests
    await userRef.update({
      approvalStatus: 'processing',
      updatedAt: new Date().toISOString(),
    });
    
    // Update user with approval
    const updateData = {
      approved: true,
      approvalStatus: 'approved' as const,
      approvalHistory: [...currentHistory, approvalEntry],
      canReapplyAt: null, // Clear any cooldown
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
    console.log(`📧 Email notification: ${userType} ${userId} approved by admin ${adminId}`);
    
    return NextResponse.json({
      success: true,
      message: `${userType} approved successfully`,
      userId,
      approvalEntry,
    });

  } catch (error) {
    console.error('Error approving user:', error);
    
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: (error as any).issues } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to approve user' } },
      { status: 500 }
    );
  }
}
