import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { UpdateRequestSchema } from '@/lib/schemas/business';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { mockRequests, paginateMockData, shouldUseMockData } from '@/lib/mock-data';

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
      const businessRequests = mockRequests.filter(req => req.businessId === businessId);
      const result = paginateMockData(businessRequests, Math.floor(offset / limit) + 1, limit);
      
      return NextResponse.json({
        requests: result.data.map(req => ({
          id: req.id,
          influencer: req.influencerName,
          followers: 25000,
          tier: 'Gold',
          proposedSplitPct: 25,
          discountType: 'percentage',
          userDiscountPct: 30,
          userDiscountCents: undefined,
          minSpendCents: 2500,
          createdAt: req.requestedAt,
          status: req.status.toLowerCase()
        })),
        hasMore: result.pagination.hasNext,
        nextOffset: result.pagination.hasNext ? offset + limit : null,
        source: 'mock'
      });
    }

    // Query influencer requests for this business
    const requestsRef = adminDb.collection('influencerRequests');
    const requestsQuery = requestsRef
      .where('bizId', '==', businessId)
      .limit(limit);

    const requestsSnapshot = await requestsQuery.get();
    
    const requests = requestsSnapshot.docs
      .map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          id: doc.id,
          influencer: data.influencerName || `Influencer ${data.infId?.slice(-4) || 'Unknown'}`,
          followers: data.followers || 0,
          tier: data.tier || 'Small',
          proposedSplitPct: data.proposedSplitPct || 20,
          discountType: data.discountType || 'percentage',
          userDiscountPct: data.userDiscountPct,
          userDiscountCents: data.userDiscountCents,
          minSpendCents: data.minSpendCents,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          status: data.status || 'pending'
        };
      })
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

    const hasMore = requestsSnapshot.docs.length === limit;
    const nextOffset = hasMore ? offset + limit : null;

    return NextResponse.json({
      requests,
      hasMore,
      nextOffset
    });

  } catch (error: any) {
    console.error('Error fetching business requests:', error);
    
    // Handle quota exceeded errors with mock data fallback
    if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
      console.log('Quota exceeded, falling back to mock data');
      
      const { searchParams } = new URL(request.url);
      const businessId = searchParams.get('businessId');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      const businessRequests = mockRequests.filter(req => req.businessId === businessId);
      const result = paginateMockData(businessRequests, Math.floor(offset / limit) + 1, limit);
      
      return NextResponse.json({
        requests: result.data.map(req => ({
          id: req.id,
          influencer: req.influencerName,
          followers: 25000,
          tier: 'Gold',
          proposedSplitPct: 25,
          discountType: 'percentage',
          userDiscountPct: 30,
          userDiscountCents: undefined,
          minSpendCents: 2500,
          createdAt: req.requestedAt,
          status: req.status.toLowerCase()
        })),
        hasMore: result.pagination.hasNext,
        nextOffset: result.pagination.hasNext ? offset + limit : null,
        source: 'mock_fallback'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateRequestSchema.parse(body);
    const { requestId, status, counterOffer } = parsed;
    
    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (counterOffer) {
      updateData.counterOffer = counterOffer;
    }

    await adminDb.collection('influencerRequests').doc(requestId).update(updateData);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('POST /api/business/requests - Request body:', body);
    
    const { businessId, influencer, followers, tier, proposedSplitPct, discountType, userDiscountPct, userDiscountCents, minSpendCents } = body;
    
    if (!businessId || !influencer) {
      console.log('Missing required fields:', { businessId, influencer });
      return NextResponse.json({ error: 'Missing required fields: businessId and influencer are required' }, { status: 400 });
    }

    // Check if Firebase is configured
    if (!adminDb) {
      console.log('Firebase not configured, adminDb is null');
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Check for existing active requests to this influencer
    const existingRequestsQuery = adminDb.collection('influencerRequests')
      .where('bizId', '==', businessId)
      .where('influencerName', '==', influencer)
      .where('status', 'in', ['pending', 'countered']);

    const existingRequestsSnapshot = await existingRequestsQuery.get();
    
    if (!existingRequestsSnapshot.empty) {
      console.log('Active request already exists for this influencer');
      return NextResponse.json({ 
        error: 'You already have an active request with this influencer. Please wait for them to respond or close the existing request before sending a new one.',
        code: 'DUPLICATE_REQUEST'
      }, { status: 409 });
    }

    // Create new influencer request
    const requestData = {
      bizId: businessId,
      influencerName: influencer,
      followers: followers || 0,
      tier: tier || 'Small',
      proposedSplitPct: proposedSplitPct || 20,
      discountType: discountType || 'percentage',
      userDiscountPct: userDiscountPct,
      userDiscountCents: userDiscountCents,
      minSpendCents: minSpendCents,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating request with data:', requestData);
    const docRef = await adminDb.collection('influencerRequests').add(requestData);

    // Update business metrics - increment active requests count
    try {
      const metricsRef = adminDb.collection('businessMetrics').doc(businessId);
      await metricsRef.set({
        activeRequests: adminDb.FieldValue.increment(1),
        updatedAt: new Date()
      }, { merge: true });
    } catch (metricsError) {
      console.warn('Failed to update business metrics:', metricsError);
      // Don't fail the request creation if metrics update fails
    }

    return NextResponse.json({ success: true, requestId: docRef.id });

  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
