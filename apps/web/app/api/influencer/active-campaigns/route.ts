import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const url = new URL(request.url);
    const infId = url.searchParams.get('infId') || user?.uid;
    
    if (!infId) {
      return NextResponse.json({ error: 'Influencer ID required' }, { status: 400 });
    }
    
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get active coupons for this influencer - simplified to avoid index issues
    let couponsQuery = adminDb
      .collection('coupons')
      .where('infId', '==', infId)
      .where('status', '==', 'active');

    // Try with ordering, fall back to simple query if index not ready
    let couponsSnapshot;
    try {
      couponsSnapshot = await couponsQuery.orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
    } catch (indexError) {
      console.log('Index not ready, using simple query:', indexError);
      couponsSnapshot = await couponsQuery.limit(limit).get();
    }
    const campaigns = [];

    // Get campaign details for each coupon
    for (const couponDoc of couponsSnapshot.docs) {
      const couponData = couponDoc.data();
      
      // Get offer details
      const offerDoc = await adminDb.collection('offers').doc(couponData.offerId).get();
      if (!offerDoc.exists) continue;
      
      const offerData = offerDoc.data();
      
      // Get business details
      let businessName = 'Unknown Business';
      try {
        const businessDoc = await adminDb.collection('businesses').doc(offerData.bizId).get();
        if (businessDoc.exists) {
          businessName = businessDoc.data()?.name || businessName;
        }
      } catch (error) {
        console.log('Business not found:', offerData.bizId);
      }

      // Get redemption count
      const redemptionsQuery = adminDb
        .collection('redemptions')
        .where('couponId', '==', couponDoc.id);
      const redemptionsSnapshot = await redemptionsQuery.get();

      campaigns.push({
        id: couponDoc.id,
        offerId: couponData.offerId,
        title: offerData.title,
        description: offerData.description,
        businessName,
        businessId: offerData.bizId,
        splitPct: offerData.splitPct,
        minSpend: offerData.minSpend,
        couponCode: couponData.code,
        couponType: couponData.type,
        linkId: couponData.linkId,
        deadlineAt: couponData.deadlineAt,
        redemptions: redemptionsSnapshot.size,
        earnings: redemptionsSnapshot.docs.reduce((sum: number, doc: any) => sum + (doc.data().infEarnings || 0), 0),
        status: 'active',
        createdAt: couponData.createdAt
      });
    }

    return NextResponse.json({
      campaigns,
      hasMore: couponsSnapshot.size === limit
    });

  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active campaigns' },
      { status: 500 }
    );
  }
}
