import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { UpdateRequestSchema } from '@/lib/schemas/business';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

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

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
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
    return NextResponse.json(
      { error: 'Failed to fetch requests', details: error.message },
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

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
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
    
    const { businessId, influencerId, influencer, followers, tier, proposedSplitPct, discountType, userDiscountPct, userDiscountCents, minSpendCents, title, description } = body;
    
    if (!businessId || (!influencerId && !influencer)) {
      console.log('Missing required fields:', { businessId, influencerId, influencer });
      return NextResponse.json({ error: 'Missing required fields: businessId and either influencerId or influencer name are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      console.log('Firebase not configured, adminDb is null');
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    let finalInfluencerId = influencerId;
    let finalInfluencerName = influencer;
    let businessName = 'Unknown Business';

    // If influencerId is provided, get influencer details
    if (influencerId) {
      try {
        const influencerDoc = await adminDb.collection('influencers').doc(influencerId).get();
        if (influencerDoc.exists) {
          const influencerData = influencerDoc.data();
          finalInfluencerName = influencerData?.name || influencerData?.displayName || influencer || 'Unknown Influencer';
        }
      } catch (error) {
        console.warn('Could not fetch influencer details:', error);
      }
    } else {
      // If only influencer name provided, try to find by name (fallback for existing functionality)
      try {
        const influencerQuery = adminDb.collection('influencers')
          .where('name', '==', influencer)
          .limit(1);
        const influencerSnapshot = await influencerQuery.get();
        
        if (!influencerSnapshot.empty) {
          const influencerDoc = influencerSnapshot.docs[0];
          finalInfluencerId = influencerDoc.id;
          finalInfluencerName = influencerDoc.data().name;
        } else {
          // Create a placeholder influencer record for name-only requests
          const placeholderInfluencer = {
            name: influencer,
            followers: followers || 0,
            tier: tier || 'Nano',
            verified: false,
            platforms: ['instagram'],
            createdAt: new Date(),
            isPlaceholder: true
          };
          const newInfluencerRef = await adminDb.collection('influencers').add(placeholderInfluencer);
          finalInfluencerId = newInfluencerRef.id;
        }
      } catch (error) {
        console.warn('Could not find or create influencer:', error);
        finalInfluencerId = 'placeholder_' + Date.now();
      }
    }

    // Get business name
    try {
      const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
      if (businessDoc.exists) {
        businessName = businessDoc.data()?.name || businessName;
      }
    } catch (error) {
      console.warn('Could not fetch business details:', error);
    }

    // Check for existing active requests to this influencer
    const existingRequestsQuery = adminDb.collection('influencerRequests')
      .where('bizId', '==', businessId)
      .where('infId', '==', finalInfluencerId)
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
      infId: finalInfluencerId,
      influencerName: finalInfluencerName,
      businessName: businessName,
      title: title || `Collaboration Request from ${businessName}`,
      description: description || `${businessName} would like to collaborate with you on a campaign.`,
      followers: followers || 0,
      tier: tier || 'Nano',
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
        activeRequests: 1, // Simple increment since FieldValue may not be available
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
