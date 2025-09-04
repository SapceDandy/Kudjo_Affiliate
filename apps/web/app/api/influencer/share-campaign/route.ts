import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();
    const { couponId, platform, content, infId } = body;
    
    const actualInfId = infId || user?.uid;
    if (!actualInfId) {
      return NextResponse.json({ error: 'Influencer ID required' }, { status: 400 });
    }

    if (!couponId || !platform) {
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

    // Get affiliate link if exists
    let shareUrl = `${process.env.NEXTAUTH_URL}/r/${couponData?.code}`;
    if (couponData?.linkId) {
      const linkDoc = await adminDb!.collection('affiliateLinks').doc(couponData.linkId).get();
      if (linkDoc.exists) {
        shareUrl = linkDoc.data()?.url || shareUrl;
      }
    }

    // Record the share activity
    const shareId = nanoid();
    const now = new Date();
    
    await adminDb!.collection('shareActivities').doc(shareId).set({
      id: shareId,
      couponId,
      infId: actualInfId,
      offerId: couponData?.offerId,
      bizId: couponData?.bizId,
      platform,
      content: content || '',
      shareUrl,
      timestamp: now,
      createdAt: now,
      updatedAt: now
    });

    // Update coupon with share activity
    await adminDb!.collection('coupons').doc(couponId).update({
      lastSharedAt: now,
      shareCount: couponData?.shareCount ? couponData.shareCount + 1 : 1,
      updatedAt: now
    });

    return NextResponse.json({
      success: true,
      shareUrl,
      shareId
    });

  } catch (error) {
    console.error('Error sharing campaign:', error);
    return NextResponse.json(
      { error: 'Failed to share campaign' },
      { status: 500 }
    );
  }
}
