import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Force cleanup of requests - admin endpoint

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const influencerId = searchParams.get('influencerId');
    
    if (!businessId || !influencerId) {
      return NextResponse.json({ error: 'Missing businessId or influencerId' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    console.log(`Force cleanup: removing all requests between business ${businessId} and influencer ${influencerId}`);

    // Find all requests between this business and influencer
    const requestsQuery = adminDb.collection('influencerRequests')
      .where('businessId', '==', businessId)
      .where('influencerId', '==', influencerId);

    const requestsSnapshot = await requestsQuery.get();
    console.log(`Found ${requestsSnapshot.docs.length} requests to delete`);

    // Delete all requests
    const batch = adminDb.batch();
    const deletedIds = [];
    
    for (const doc of requestsSnapshot.docs) {
      batch.delete(doc.ref);
      deletedIds.push(doc.id);
      console.log(`Queued for deletion: ${doc.id} (status: ${doc.data().status})`);
    }

    if (deletedIds.length > 0) {
      await batch.commit();
      console.log(`Successfully deleted ${deletedIds.length} requests:`, deletedIds);
    }

    // Clean up business activeRequests
    try {
      await adminDb.collection('businesses').doc(businessId).update({
        [`activeRequests.${influencerId}`]: null,
        updatedAt: new Date()
      });
      console.log(`Cleaned up business activeRequests for influencer ${influencerId}`);
    } catch (error) {
      console.warn('Error cleaning up business activeRequests:', error);
    }

    return NextResponse.json({ 
      success: true, 
      deletedRequests: deletedIds.length,
      deletedIds 
    });

  } catch (error) {
    console.error('Error in cleanup-requests:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup requests' },
      { status: 500 }
    );
  }
}
