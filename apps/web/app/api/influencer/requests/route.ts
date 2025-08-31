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

    // Get influencer requests from Firestore - simplified to avoid index issues
    let requestsQuery = adminDb
      .collection('influencerRequests')
      .where('infId', '==', infId);

    // Try with ordering, fall back to simple query if index not ready
    let requestsSnapshot;
    try {
      requestsSnapshot = await requestsQuery.orderBy('createdAt', 'desc').limit(limit).get();
    } catch (indexError) {
      console.log('Index not ready, using simple query:', indexError);
      requestsSnapshot = await requestsQuery.limit(limit).get();
    }
    const requests = [];

    for (const requestDoc of requestsSnapshot.docs) {
      const requestData = requestDoc.data();
      
      // Get business details
      let businessName = 'Unknown Business';
      try {
        const businessDoc = await adminDb.collection('businesses').doc(requestData.bizId).get();
        if (businessDoc.exists) {
          businessName = businessDoc.data()?.name || businessName;
        }
      } catch (error) {
        console.log('Business not found:', requestData.bizId);
      }

      requests.push({
        id: requestDoc.id,
        ...requestData,
        businessName,
        createdAt: requestData.createdAt?.toDate() || new Date()
      });
    }

    return NextResponse.json({
      requests,
      hasMore: requestsSnapshot.size === limit
    });

  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();
    const { requestId, action, counterOffer, infId } = body;
    
    const actualInfId = infId || user?.uid;
    if (!actualInfId) {
      return NextResponse.json({ error: 'Influencer ID required' }, { status: 400 });
    }


    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const requestRef = adminDb.collection('influencerRequests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestDoc.data();
    if (requestData?.infId !== actualInfId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    let updateData: any = {
      updatedAt: now
    };

    switch (action) {
      case 'accept':
        updateData.status = 'accepted';
        updateData.respondedAt = now;
        break;
      case 'decline':
        updateData.status = 'declined';
        updateData.respondedAt = now;
        break;
      case 'counter':
        if (!counterOffer) {
          return NextResponse.json({ error: 'Counter offer data required' }, { status: 400 });
        }
        updateData.status = 'counter_offered';
        updateData.counterOffer = counterOffer;
        updateData.respondedAt = now;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await requestRef.update(updateData);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}
