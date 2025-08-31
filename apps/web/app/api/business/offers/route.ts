import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CreateOfferSchema } from '@/lib/schemas/business';
import { requireRole } from '@/lib/middleware/auth';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  const authResult = await requireRole('business', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    // Verify business ownership for non-admin users
    if (authResult.user.role === 'business' && authResult.user.businessId !== businessId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Query business offers from Firestore - simplified to avoid index issues
    const offersRef = adminDb.collection('offers');
    let offersQuery = offersRef.where('bizId', '==', businessId);
    
    // Try with ordering, fall back to simple query if index not ready
    let offersSnapshot;
    try {
      offersSnapshot = await offersQuery.orderBy('createdAt', 'desc').limit(limit).get();
    } catch (indexError) {
      console.log('Index not ready, using simple query:', indexError);
      offersSnapshot = await offersQuery.limit(limit).get();
    }
    
    const offers = offersSnapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Offer',
        status: data.active ? 'active' : 'paused',
        splitPct: data.splitPct || 20,
        discountType: data.discountType || 'percentage',
        userDiscountPct: data.userDiscountPct,
        userDiscountCents: data.userDiscountCents,
        minSpendCents: data.minSpendCents,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        description: data.description,
        terms: data.terms
      };
    });

    const hasMore = offersSnapshot.docs.length === limit;
    const nextOffset = hasMore ? offset + limit : null;

    return NextResponse.json({
      offers,
      hasMore,
      nextOffset
    });

  } catch (error) {
    console.error('Error fetching business offers:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch offers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('business', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const parsed = CreateOfferSchema.parse(body);
    const { businessId, title, discountType, splitPct, userDiscountPct, userDiscountCents, minSpendCents, description, terms } = parsed;

    // Verify business ownership for non-admin users
    if (authResult.user.role === 'business' && authResult.user.businessId !== businessId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify business exists
    const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const business = businessDoc.data()!;
    const now = new Date();

    const offerData = {
      bizId: businessId,
      businessName: business.name || business.businessName || 'Unknown Business',
      title,
      discountType,
      discountValue: discountType === 'percentage' ? userDiscountPct : userDiscountCents,
      splitPct,
      userDiscountPct: userDiscountPct || null,
      userDiscountCents: userDiscountCents || null,
      minSpendCents: minSpendCents || null,
      description: description || '',
      terms: terms || '',
      status: 'active',
      active: true, // Legacy field for backward compatibility
      eligibleTiers: ['S', 'M', 'L', 'XL', 'Huge'], // Default to all tiers
      maxInfluencers: 100, // Default limit
      maxUsesPerInfluencer: 50, // Default per-influencer limit
      budgetCents: 100000, // Default $1000 budget
      totalRedemptions: 0,
      totalRevenue: 0,
      activeInfluencers: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: authResult.user.uid,
      startAt: now,
      endAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days default
    };

    const docRef = await adminDb.collection('offers').add(offerData);
    
    // Log the creation
    await adminDb.collection('campaignLogs').add({
      campaignId: docRef.id,
      action: 'create',
      performedBy: authResult.user.uid,
      performedAt: now,
      businessId
    });

    return NextResponse.json({
      id: docRef.id,
      ...offerData,
      createdAt: offerData.createdAt.toISOString(),
      updatedAt: offerData.updatedAt.toISOString(),
      startAt: offerData.startAt.toISOString(),
      endAt: offerData.endAt.toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating offer:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid offer data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create offer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
