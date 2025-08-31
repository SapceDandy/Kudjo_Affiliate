import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { UnifiedCouponService } from '@/lib/models/unified-coupon';
import { z } from 'zod';

const submitSchema = z.object({
  couponId: z.string().min(1),
  contentUrl: z.string().url(),
  contentPlatform: z.enum(['instagram', 'tiktok', 'youtube']),
  description: z.string().optional()
});

const reviewSchema = z.object({
  couponId: z.string().min(1),
  approved: z.boolean(),
  reviewNotes: z.string().optional()
});

// Submit content for post verification
export async function POST(request: NextRequest) {
  const authResult = await requireRole('influencer', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { couponId, contentUrl, contentPlatform, description } = submitSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get the coupon
    const couponRef = adminDb.collection('coupons').doc(couponId);
    const couponDoc = await couponRef.get();

    if (!couponDoc.exists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const coupon = couponDoc.data()!;

    // Verify ownership for non-admin users
    if (authResult.user.role === 'influencer' && coupon.influencerId !== authResult.user.influencerId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if content deadline has passed
    if (coupon.type === 'CONTENT_MEAL' && UnifiedCouponService.isContentDeadlinePassed(coupon)) {
      return NextResponse.json({ 
        error: 'Content submission deadline has passed' 
      }, { status: 400 });
    }

    const now = new Date();
    const postVerificationDeadline = UnifiedCouponService.calculatePostVerificationDeadline(now);

    // Update coupon with content submission
    await couponRef.update({
      contentUrl,
      contentPlatform,
      contentSubmittedAt: now,
      postVerificationStatus: 'submitted',
      postVerificationDeadline,
      updatedAt: now,
      notes: description || null
    });

    // Add compliance check
    const complianceCheck = {
      id: `check_${Date.now()}`,
      type: 'post_verification',
      status: 'pending',
      checkedAt: now,
      details: description || 'Content submitted for verification',
      evidence: {
        url: contentUrl,
        description: description || ''
      }
    };

    await couponRef.update({
      complianceChecks: [...(coupon.complianceChecks || []), complianceCheck]
    });

    // Create notification for admin review
    await adminDb.collection('adminNotifications').add({
      type: 'post_verification_required',
      couponId,
      influencerId: coupon.influencerId,
      campaignId: coupon.offerId,
      contentUrl,
      contentPlatform,
      submittedAt: now,
      priority: 'medium',
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      message: 'Content submitted for verification',
      couponId,
      postVerificationDeadline: postVerificationDeadline.toISOString(),
      reviewStatus: 'submitted'
    });

  } catch (error) {
    console.error('Error submitting content for verification:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Admin review of submitted content
export async function PUT(request: NextRequest) {
  const authResult = await requireRole('admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { couponId, approved, reviewNotes } = reviewSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get the coupon
    const couponRef = adminDb.collection('coupons').doc(couponId);
    const couponDoc = await couponRef.get();

    if (!couponDoc.exists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const coupon = couponDoc.data()!;
    const now = new Date();

    // Update post verification status
    const newStatus = approved ? 'approved' : 'rejected';
    await couponRef.update({
      postVerificationStatus: newStatus,
      postVerificationReviewedAt: now,
      postVerificationReviewedBy: authResult.user.uid,
      postVerificationNotes: reviewNotes || null,
      updatedAt: now
    });

    // Update compliance check
    const updatedChecks = (coupon.complianceChecks || []).map((check: any) => {
      if (check.type === 'post_verification' && check.status === 'pending') {
        return {
          ...check,
          status: approved ? 'passed' : 'failed',
          checkedAt: now,
          checkedBy: authResult.user.uid,
          details: reviewNotes || (approved ? 'Content approved' : 'Content rejected')
        };
      }
      return check;
    });

    await couponRef.update({
      complianceChecks: updatedChecks
    });

    // If rejected, potentially revoke coupon
    if (!approved) {
      await couponRef.update({
        status: 'revoked',
        revokedAt: now,
        revokedReason: 'Failed post verification'
      });
    }

    // Update admin notification
    await adminDb.collection('adminNotifications')
      .where('couponId', '==', couponId)
      .where('type', '==', 'post_verification_required')
      .where('status', '==', 'pending')
      .get()
      .then(snapshot => {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'completed',
            reviewedAt: now,
            reviewedBy: authResult.user.uid,
            approved
          });
        });
        return batch.commit();
      });

    // Create notification for influencer
    await adminDb.collection('influencerNotifications').add({
      type: 'post_verification_result',
      influencerId: coupon.influencerId,
      couponId,
      approved,
      reviewNotes: reviewNotes || null,
      reviewedAt: now,
      status: 'unread'
    });

    return NextResponse.json({
      success: true,
      message: `Content ${approved ? 'approved' : 'rejected'}`,
      couponId,
      approved,
      reviewNotes
    });

  } catch (error) {
    console.error('Error reviewing content:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to review content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get compliance status for coupons
export async function GET(request: NextRequest) {
  const authResult = await requireRole('admin', 'business', 'influencer')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('couponId');
    const influencerId = searchParams.get('influencerId');
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status') as 'pending' | 'overdue' | 'all' || 'all';

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    let query = adminDb.collection('coupons');

    // Apply filters based on role and parameters
    if (couponId) {
      const couponDoc = await query.doc(couponId).get();
      if (!couponDoc.exists) {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      }

      const coupon = couponDoc.data()!;
      const complianceStatus = UnifiedCouponService.getComplianceStatus(coupon);

      return NextResponse.json({
        coupon: {
          id: couponDoc.id,
          ...coupon,
          complianceStatus
        }
      });
    }

    // Filter by role
    if (authResult.user.role === 'influencer') {
      query = query.where('influencerId', '==', authResult.user.influencerId);
    } else if (authResult.user.role === 'business' && businessId) {
      query = query.where('businessId', '==', businessId);
    } else if (influencerId) {
      query = query.where('influencerId', '==', influencerId);
    } else if (businessId) {
      query = query.where('businessId', '==', businessId);
    }

    // Get coupons that require post verification
    const couponsSnapshot = await query
      .where('postVerificationRequired', '==', true)
      .get();

    const now = new Date();
    const couponsWithCompliance = couponsSnapshot.docs
      .map(doc => {
        const coupon = doc.data();
        const complianceStatus = UnifiedCouponService.getComplianceStatus(coupon);
        
        return {
          id: doc.id,
          ...coupon,
          complianceStatus
        };
      })
      .filter(coupon => {
        if (status === 'pending') {
          return coupon.complianceStatus.overall === 'pending';
        } else if (status === 'overdue') {
          return coupon.complianceStatus.overall === 'overdue' || 
                 coupon.complianceStatus.overall === 'failed';
        }
        return true; // 'all'
      });

    return NextResponse.json({
      coupons: couponsWithCompliance,
      summary: {
        total: couponsWithCompliance.length,
        pending: couponsWithCompliance.filter(c => c.complianceStatus.overall === 'pending').length,
        overdue: couponsWithCompliance.filter(c => c.complianceStatus.overall === 'overdue').length,
        failed: couponsWithCompliance.filter(c => c.complianceStatus.overall === 'failed').length,
        compliant: couponsWithCompliance.filter(c => c.complianceStatus.overall === 'compliant').length
      }
    });

  } catch (error) {
    console.error('Error fetching compliance status:', error);

    return NextResponse.json(
      { error: 'Failed to fetch compliance status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
