import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { z } from 'zod';
import { UpdateRequestSchema } from '@/lib/schemas/business';

// Request creation schema
const CreateRequestSchema = z.object({
  businessId: z.string(),
  influencerId: z.string(),
  influencer: z.string().optional(), // Accept both influencer and influencerName
  influencerName: z.string().optional(),
  title: z.string(),
  proposedSplitPct: z.number().min(0).max(50),
  description: z.string().optional(),
  offerId: z.string().optional(),
  followers: z.number().min(0).optional(),
  tier: z.string().optional(),
  userDiscountPct: z.number().min(0).max(100).nullable().optional(),
  userDiscountCents: z.number().min(0).nullable().optional(),
  minSpendCents: z.number().min(0).nullable().optional(),
  discountType: z.enum(['percentage', 'fixed', 'bogo', 'student', 'happy_hour', 'free_appetizer', 'first_time']).optional()
}).transform((data) => {
  // Handle both influencer and influencerName fields
  const influencerName = data.influencerName || data.influencer;
  return {
    ...data,
    influencerName,
    // Remove undefined values
    ...JSON.parse(JSON.stringify({ ...data, influencerName }))
  };
});
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
    const requestsRef = adminDb!.collection('influencerRequests');
    const requestsQuery = requestsRef
      .where('businessId', '==', businessId)
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

    // Get the request document to find businessId and influencerId
    const requestDoc = await adminDb!.collection('influencerRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestDoc.data();
    const businessId = requestData?.businessId;
    const influencerId = requestData?.influencerId;

    // If request is closed or declined, permanently delete it
    if (status === 'closed' || status === 'declined') {
      console.log(`Permanently deleting ${status} request ${requestId}`);
      
      // Delete from influencerRequests collection
      await adminDb!.collection('influencerRequests').doc(requestId).delete();
      console.log(`Deleted request ${requestId} from influencerRequests collection`);
      
      // Remove from business activeRequests
      if (businessId && influencerId) {
        try {
          await adminDb!.collection('businesses').doc(businessId).update({
            [`activeRequests.${influencerId}`]: null, // Remove the field
            updatedAt: new Date()
          });
          console.log(`Removed request ${requestId} from business ${businessId} activeRequests`);
        } catch (error) {
          console.error('Error removing request from business activeRequests:', error);
          // Don't fail the main operation if this fails
        }
      }
    } else {
      // For other status updates (approved, countered), just update the status
      await adminDb!.collection('influencerRequests').doc(requestId).update(updateData);
      console.log(`Updated request ${requestId} status to ${status}`);
      
      // If request is approved, create an active offer
      if (status === 'approved' && requestData) {
        console.log(`Creating active offer for approved request ${requestId}`);
        
        try {
          const now = new Date();
          const offerData = {
            businessId: businessId,
            bizId: businessId,
            title: requestData.title || `Collaboration with ${requestData.influencerName || 'Influencer'}`,
            description: requestData.description || requestData.message || '',
            discountType: requestData.discountType || 'percentage',
            discountValue: requestData.discountType === 'percentage' ? requestData.userDiscountPct : requestData.userDiscountCents,
            splitPct: requestData.splitPct || 25,
            userDiscountPct: requestData.userDiscountPct,
            userDiscountCents: requestData.userDiscountCents,
            minSpendCents: requestData.minSpendCents || 0,
            redemptionLimit: null, // Default to unlimited for request-based offers
            budgetCents: 0,
            eligibleTiers: ['S', 'M', 'L', 'XL'],
            active: true,
            status: 'active',
            createdAt: now,
            activeInfluencers: 0,
            updatedAt: now,
            createdBy: businessId,
            startAt: now,
            endAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days default
            createdFromRequest: requestId, // Track that this offer came from a request
            exclusive: requestData.makeExclusive || false // Set exclusive based on request data
          };

          const newOfferRef = await adminDb!.collection('offers').add(offerData);
          console.log(`Created active offer ${newOfferRef.id} for approved request ${requestId}`);
          
          // Log the creation
          await adminDb.collection('campaignLogs').add({
            campaignId: businessId,
            action: 'create',
            performedBy: businessId,
            performedAt: now,
            businessId,
            offerId: newOfferRef.id,
            source: 'approved_request'
          });
          
        } catch (error) {
          console.error('Error creating offer for approved request:', error);
          // Don't fail the request update if offer creation fails
        }
      }
      
      if (businessId && influencerId) {
        try {
          await adminDb!.collection('businesses').doc(businessId).update({
            [`activeRequests.${influencerId}.status`]: status,
            [`activeRequests.${influencerId}.updatedAt`]: new Date(),
            updatedAt: new Date()
          });
          console.log(`Updated request ${requestId} status to ${status} in business ${businessId} activeRequests`);
        } catch (error) {
          console.error('Error updating request status in business activeRequests:', error);
          // Don't fail the main update if this fails
        }
      }
    }
    
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

    // Validate and sanitize input
    const validatedData = CreateRequestSchema.parse(body);
    
    // Helper to remove undefined values
    const pruneUndefined = <T extends Record<string, any>>(obj: T): T => 
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

    const cleanData = pruneUndefined(validatedData);

    const {
      businessId,
      influencerId,
      influencerName,
      title,
      proposedSplitPct,
      description,
      offerId,
      followers,
      tier,
      userDiscountPct,
      userDiscountCents,
      minSpendCents,
      discountType
    } = cleanData;
    
    if (!businessId || (!influencerId && !influencerName)) {
      console.log('Missing required fields:', { businessId, influencerId, influencerName });
      return NextResponse.json({ error: 'Missing required fields: businessId and either influencerId or influencer name are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('Failed to initialize Firebase Admin');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if business is approved
    const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    
    const businessData = businessDoc.data();
    if (!businessData?.approved || businessData?.approvalStatus !== 'approved') {
      return NextResponse.json({ 
        error: 'Business not approved',
        message: 'Your business account must be approved before sending requests',
        approvalStatus: businessData?.approvalStatus || 'pending'
      }, { status: 403 });
    }

    let finalInfluencerId = influencerId;
    let finalInfluencerName = influencerName;
    let businessName = 'Unknown Business';

    // If influencerId is provided, get influencer details
    if (influencerId) {
      try {
        const influencerDoc = await adminDb!.collection('influencers').doc(influencerId).get();
        if (influencerDoc.exists) {
          const influencerData = influencerDoc.data();
          finalInfluencerName = influencerData?.name || influencerData?.displayName || influencerName || 'Unknown Influencer';
        }
      } catch (error) {
        console.warn('Could not fetch influencer details:', error);
      }
    } else {
      // If only influencer name provided, try to find by name (fallback for existing functionality)
      try {
        const influencerQuery = adminDb!.collection('influencers')
          .where('name', '==', influencerName)
          .limit(1);
        const influencerSnapshot = await influencerQuery.get();
        
        if (!influencerSnapshot.empty) {
          const influencerDoc = influencerSnapshot.docs[0];
          finalInfluencerId = influencerDoc.id;
          finalInfluencerName = influencerDoc.data().name;
        } else {
          // Create a placeholder influencer record for name-only requests
          const placeholderInfluencer = {
            name: influencerName,
            followers: followers || 0,
            tier: tier || 'Nano',
            verified: false,
            platforms: ['instagram'],
            createdAt: new Date(),
            isPlaceholder: true
          };
          const newInfluencerRef = await adminDb!.collection('influencers').add(placeholderInfluencer);
          finalInfluencerId = newInfluencerRef.id;
        }
      } catch (error) {
        console.warn('Could not find or create influencer:', error);
        finalInfluencerId = 'placeholder_' + Date.now();
      }
    }

    // Get business name
    try {
      const businessDoc = await adminDb!.collection('businesses').doc(businessId).get();
      if (businessDoc.exists) {
        businessName = businessDoc.data()?.name || businessName;
      }
    } catch (error) {
      console.warn('Could not fetch business details:', error);
    }

    // First, clean up any existing closed/declined requests for this influencer
    const allRequestsQuery = adminDb!.collection('influencerRequests')
      .where('businessId', '==', businessId)
      .where('influencerId', '==', finalInfluencerId);

    const allRequestsSnapshot = await allRequestsQuery.get();
    console.log(`Found ${allRequestsSnapshot.docs.length} existing requests for influencer ${finalInfluencerId}`);
    
    const closedRequests = [];
    const activeRequests = [];
    
    for (const doc of allRequestsSnapshot.docs) {
      const data = doc.data();
      const status = data.status;
      console.log(`Request ${doc.id}: status=${status}`);
      
      if (status === 'closed' || status === 'declined') {
        closedRequests.push(doc.id);
      } else if (status === 'pending' || status === 'countered' || status === 'approved') {
        activeRequests.push({ id: doc.id, status });
      }
    }
    
    // Delete closed/declined requests permanently
    if (closedRequests.length > 0) {
      console.log(`Deleting ${closedRequests.length} closed/declined requests:`, closedRequests);
      const batch = adminDb!.batch();
      for (const requestId of closedRequests) {
        batch.delete(adminDb!.collection('influencerRequests').doc(requestId));
      }
      await batch.commit();
      console.log('Successfully deleted closed/declined requests');
    }
    
    // Check for remaining active requests
    if (activeRequests.length > 0) {
      console.log(`Found ${activeRequests.length} active requests blocking new request:`, activeRequests);
      return NextResponse.json({ 
        error: 'You already have an active request with this influencer. Please wait for them to respond or close the existing request before sending a new one.',
        code: 'DUPLICATE_REQUEST',
        activeRequests: activeRequests
      }, { status: 409 });
    }
    
    console.log('No active requests found, proceeding with new request creation');
    
    // Additional safety check: verify the influencer isn't in business activeRequests
    try {
      const businessDoc = await adminDb!.collection('businesses').doc(businessId).get();
      if (businessDoc.exists) {
        const businessData = businessDoc.data();
        const activeRequestsData = businessData?.activeRequests || {};
        
        if (activeRequestsData[finalInfluencerId]) {
          console.log(`Found orphaned request in business activeRequests for influencer ${finalInfluencerId}, cleaning up`);
          await adminDb!.collection('businesses').doc(businessId).update({
            [`activeRequests.${finalInfluencerId}`]: null,
            updatedAt: new Date()
          });
          console.log('Cleaned up orphaned business activeRequest');
        }
      }
    } catch (error) {
      console.warn('Error checking business activeRequests:', error);
    }

    // Create new influencer request
    // Build request data, excluding undefined values
    const requestData: any = {
      businessId: businessId,
      influencerId: finalInfluencerId,
      influencerName: finalInfluencerName,
      businessName: businessName,
      title: title || `Collaboration Request from ${businessName}`,
      description: description || `${businessName} would like to collaborate with you on a campaign.`,
      followers: followers || 0,
      tier: tier || 'Nano',
      proposedSplitPct: proposedSplitPct || 20,
      discountType: discountType || 'percentage',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they have values
    if (userDiscountPct !== undefined && userDiscountPct !== null) {
      requestData.userDiscountPct = userDiscountPct;
    }
    if (userDiscountCents !== undefined && userDiscountCents !== null) {
      requestData.userDiscountCents = userDiscountCents;
    }
    if (minSpendCents !== undefined && minSpendCents !== null) {
      requestData.minSpendCents = minSpendCents;
    }

    console.log('Creating request with data:', requestData);
    
    // Store request in influencerRequests collection with unique ID
    const requestRef = await adminDb!.collection('influencerRequests').add(requestData);
    
    // Also update business document with active request tracking
    const activeRequestData: any = {
      id: requestRef.id,
      influencerName: finalInfluencerName,
      status: 'pending',
      createdAt: new Date(),
      tier: tier || 'Nano',
      followers: followers || 0,
      proposedSplitPct: proposedSplitPct || 20,
      discountType: discountType || 'percentage'
    };

    // Only add optional fields if they have values
    if (userDiscountPct !== undefined && userDiscountPct !== null) {
      activeRequestData.userDiscountPct = userDiscountPct;
    }
    if (userDiscountCents !== undefined && userDiscountCents !== null) {
      activeRequestData.userDiscountCents = userDiscountCents;
    }
    if (minSpendCents !== undefined && minSpendCents !== null) {
      activeRequestData.minSpendCents = minSpendCents;
    }

    await adminDb!.collection('businesses').doc(businessId).update({
      [`activeRequests.${finalInfluencerId}`]: activeRequestData,
      updatedAt: new Date()
    });
    
    console.log('Request created successfully for influencer:', influencerId, 'from business:', businessId);

    // Update business metrics - increment active requests count
    try {
      const metricsRef = adminDb!.collection('businessMetrics').doc(businessId);
      await metricsRef.set({
        activeRequests: 1, // Simple increment since FieldValue may not be available
        updatedAt: new Date()
      }, { merge: true });
    } catch (metricsError) {
      console.warn('Failed to update business metrics:', metricsError);
      // Don't fail the request creation if metrics update fails
    }

    return NextResponse.json({ 
      success: true, 
      requestId: requestRef.id,
      message: 'Request sent successfully' 
    });

  } catch (error) {
    console.error('Error creating request:', error);
    
    // Check if it's a validation error
    if (error instanceof z.ZodError) {
      console.error('Validation error details:', error.errors);
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
