import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();
    const { couponId, contentType, contentUrl, caption, platform, infId } = body;
    
    const actualInfId = infId || user?.uid;
    if (!actualInfId) {
      return NextResponse.json({ error: 'Influencer ID required' }, { status: 400 });
    }

    if (!couponId || !contentType || !contentUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get coupon details
    const couponDoc = await adminDb!.collection('coupons').doc(couponId).get();
    if (!couponDoc.exists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const couponData = couponDoc.data();
    if (couponData?.infId !== actualInfId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Record the content submission
    const submissionId = nanoid();
    const now = new Date();
    
    await adminDb!.collection('contentSubmissions').doc(submissionId).set({
      id: submissionId,
      couponId,
      infId: actualInfId,
      offerId: couponData?.offerId,
      bizId: couponData?.bizId,
      contentType, // 'photo', 'video', 'story', 'reel'
      contentUrl,
      caption: caption || '',
      platform: platform || 'instagram',
      status: 'submitted',
      lastContentSubmittedAt: now,
      contentSubmissionCount: couponData?.contentSubmissionCount ? couponData.contentSubmissionCount + 1 : 1,
      submittedAt: now,
      createdAt: now,
      updatedAt: now
    });

    // Update coupon with content submission
    await adminDb!.collection('coupons').doc(couponId).update({
      contentSubmitted: true,
      contentSubmittedAt: now,
      updatedAt: now
    });

    // Check if this completes the campaign requirements
    const isContentCoupon = couponData?.type === 'CONTENT_MEAL';
    if (isContentCoupon) {
      // Mark content requirement as fulfilled
      await adminDb!.collection('coupons').doc(couponId).update({
        'admin.contentSubmitted': true,
        'admin.contentSubmittedAt': now
      });
    }

    return NextResponse.json({
      success: true,
      submissionId,
      message: 'Content submitted successfully! Business will review and approve.'
    });

  } catch (error) {
    console.error('Error submitting content:', error);
    return NextResponse.json(
      { error: 'Failed to submit content' },
      { status: 500 }
    );
  }
}
