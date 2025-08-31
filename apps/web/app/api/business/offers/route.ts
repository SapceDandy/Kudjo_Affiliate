import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CreateOfferSchema } from '@/lib/schemas/business';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
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
  try {
    const body = await request.json();
    const parsed = CreateOfferSchema.parse(body);
    const { businessId, title, discountType, splitPct, userDiscountPct, userDiscountCents, minSpendCents, description, terms } = parsed;

    const offerData = {
      bizId: businessId,
      title,
      discountType,
      splitPct,
      userDiscountPct: userDiscountPct || null,
      userDiscountCents: userDiscountCents || null,
      minSpendCents: minSpendCents || null,
      description: description || '',
      terms: terms || '',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection('offers').add(offerData);
    
    return NextResponse.json({
      id: docRef.id,
      ...offerData
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    );
  }
}
