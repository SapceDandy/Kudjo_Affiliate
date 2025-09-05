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
      success: true, 
      offerId: businessId,
      message: 'Offer created successfully' 
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
    const { businessId, title, discountType, splitPct, userDiscountPct, userDiscountCents, minSpendCents, description, terms } = parsed;


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
      bizId: businessId,
      businessName: business.name || 'Unknown Business',
      title: `${business.name || 'Business'} Partnership Offer`,
      description: description || `Partner with ${business.name || 'us'} and earn commissions on every sale you generate.`,
      discountType: discountType || 'percentage',
      discountValue: discountType === 'percentage' ? userDiscountPct : userDiscountCents,
      budgetCents: 100000,
      eligibleTiers: ['S', 'M', 'L', 'XL'],
      active: true,
      createdAt: new Date(),
      activeInfluencers: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: businessId,
      startAt: now,
      endAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days default
    };

    await adminDb!.collection('offers').doc(businessId).set(offerData);
    
    // Log the creation
    await adminDb.collection('campaignLogs').add({
      campaignId: businessId,
      action: 'create',
      performedBy: businessId,
      performedAt: now,
      businessId
    });

    return NextResponse.json({
      id: businessId,
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
