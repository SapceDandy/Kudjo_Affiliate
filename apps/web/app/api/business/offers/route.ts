import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { CreateOfferSchema } from '@/lib/schemas/business';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { mockOffers, paginateMockData, shouldUseMockData } from '@/lib/mock-data';

// Initialize Firebase Admin
function getAdminDb() {
  try {
    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      
      if (privateKey && clientEmail && projectId) {
        const app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
        return getFirestore(app);
      }
    }
    
    return getFirestore();
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {

  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }


    // Use mock data if quota exceeded or in development
    if (shouldUseMockData()) {
      const businessOffers = mockOffers.filter(offer => offer.businessId === businessId);
      const result = paginateMockData(businessOffers, Math.floor(offset / limit) + 1, limit);
      
      return NextResponse.json({
        offers: result.data.map(offer => ({
          id: offer.id,
          title: offer.title,
          status: offer.status.toLowerCase(),
          splitPct: 25,
          discountType: offer.discountType,
          userDiscountPct: offer.discountType === 'percentage' ? offer.discountValue : undefined,
          userDiscountCents: offer.discountType === 'fixed' ? offer.discountValue * 100 : undefined,
          minSpendCents: offer.minOrderValue * 100,
          createdAt: offer.createdAt,
          description: offer.description,
          terms: 'Standard terms and conditions apply'
        })),
        hasMore: result.pagination.hasNext,
        nextOffset: result.pagination.hasNext ? offset + limit : null,
        source: 'mock'
      });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Query business offers from Firestore - use simple query to avoid index issues
    const offersRef = adminDb.collection('offers');
    let offersQuery = offersRef.where('businessId', '==', businessId).limit(limit);
    
    const offersSnapshot = await offersQuery.get();
    
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
        terms: data.terms,
        exclusive: data.exclusive || false
      };
    });

    const hasMore = offersSnapshot.docs.length === limit;
    const nextOffset = hasMore ? offset + limit : null;

    return NextResponse.json({
      offers,
      hasMore,
      nextOffset,
      source: 'firestore'
    });

  } catch (error: any) {
    console.error('Error fetching business offers:', error);
    
    // Handle quota exceeded errors with mock data fallback
    if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
      console.log('Quota exceeded, falling back to mock data');
      
      const { searchParams } = new URL(request.url);
      const businessId = searchParams.get('businessId');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      const businessOffers = mockOffers.filter(offer => offer.businessId === businessId);
      const result = paginateMockData(businessOffers, Math.floor(offset / limit) + 1, limit);
      
      return NextResponse.json({
        offers: result.data.map(offer => ({
          id: offer.id,
          title: offer.title,
          status: offer.status.toLowerCase(),
          splitPct: 25,
          discountType: offer.discountType,
          userDiscountPct: offer.discountType === 'percentage' ? offer.discountValue : undefined,
          userDiscountCents: offer.discountType === 'fixed' ? offer.discountValue * 100 : undefined,
          minSpendCents: offer.minOrderValue * 100,
          createdAt: offer.createdAt,
          description: offer.description,
          terms: 'Standard terms and conditions apply'
        })),
        hasMore: result.pagination.hasNext,
        nextOffset: result.pagination.hasNext ? offset + limit : null,
        source: 'mock_fallback'
      });
    }
    
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
    const { businessId, title, discountType, splitPct, userDiscountPct, userDiscountCents, minSpendCents, redemptionLimit, description, terms, exclusive } = parsed;


    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Verify business exists
    const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const business = businessDoc.data()!;
    const now = new Date();

    // Create the offer document using bizId as document ID
    const offerData = {
      businessId: businessId,
      bizId: businessId, // Keep both for compatibility
      title: title,
      description: description || '',
      discountType: discountType,
      discountValue: discountType === 'percentage' ? userDiscountPct : userDiscountCents,
      splitPct: splitPct,
      userDiscountPct: userDiscountPct,
      userDiscountCents: userDiscountCents,
      minSpendCents: minSpendCents,
      redemptionLimit: redemptionLimit, // null for unlimited, number for limited
      budgetCents: 0,
      eligibleTiers: ['S', 'M', 'L', 'XL'],
      active: true,
      status: 'active',
      createdAt: new Date(),
      activeInfluencers: 0,
      updatedAt: now,
      createdBy: businessId,
      startAt: now,
      endAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days default
      exclusive: exclusive || false
    };

    const newOfferRef = await adminDb!.collection('offers').add(offerData);
    
    // Log the creation
    await adminDb.collection('campaignLogs').add({
      campaignId: businessId,
      action: 'create',
      performedBy: businessId,
      performedAt: now,
      businessId
    });

    return NextResponse.json({ 
      success: true, 
      offerId: newOfferRef.id,
      message: 'Offer created successfully' 
    });

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
