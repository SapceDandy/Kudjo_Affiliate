import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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
    const infId = searchParams.get('infId') || searchParams.get('influencerId');
    
    if (!infId) {
      return NextResponse.json({ error: 'Influencer ID required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    // Query influencer requests
    const requestsRef = adminDb!.collection('influencerRequests');
    let requestsSnapshot;
    
    try {
      // Try with ordering first
      const requestsQuery = requestsRef
        .where('infId', '==', infId)
        .orderBy('createdAt', 'desc');
      requestsSnapshot = await requestsQuery.get();
    } catch (indexError: any) {
      console.log('Index not ready, using simple query:', indexError?.message || 'Index error');
      // Fallback to simple query without ordering
      const simpleQuery = requestsRef.where('infId', '==', infId);
      requestsSnapshot = await simpleQuery.get();
    }
    
    const requests = requestsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Business Request',
        description: data.description,
        businessName: data.businessName || 'Unknown Business',
        businessId: data.bizId,
        splitPct: data.proposedSplitPct || 20,
        userDiscountPct: data.userDiscountPct,
        userDiscountCents: data.userDiscountCents,
        minSpendCents: data.minSpendCents,
        status: data.status || 'pending',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.(),
        businessResponse: data.businessResponse
      };
    });

    return NextResponse.json({ requests });

  } catch (error: any) {
    console.error('Error fetching influencer requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action, counterOffer } = body;
    
    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['accept', 'decline', 'counter'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    switch (action) {
      case 'accept':
        updateData.status = 'approved';
        break;
      case 'decline':
        updateData.status = 'declined';
        break;
      case 'counter':
        updateData.status = 'countered';
        if (counterOffer) {
          updateData.counterOffer = counterOffer;
        }
        break;
    }

    await adminDb!.collection('influencerRequests').doc(requestId).update(updateData);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating influencer request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}
