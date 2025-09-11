import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    let query: FirebaseFirestore.Query = adminDb.collection('influencers');
    
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const influencers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const paginatedInfluencers = influencers.slice(offset, offset + limit);

    return NextResponse.json({
      influencers: paginatedInfluencers,
      total: influencers.length,
      hasMore: offset + paginatedInfluencers.length < influencers.length
    });
  } catch (error: any) {
    console.error('Error fetching influencers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch influencers', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, influencerId, data } = body;

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    if (action === 'approve') {
      await adminDb.collection('influencers').doc(influencerId).update({
        status: 'approved',
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      return NextResponse.json({ success: true, message: 'Influencer approved' });
    }

    if (action === 'reject') {
      await adminDb.collection('influencers').doc(influencerId).update({
        status: 'rejected',
        rejectedAt: new Date(),
        updatedAt: new Date()
      });
      
      return NextResponse.json({ success: true, message: 'Influencer rejected' });
    }

    if (action === 'update') {
      await adminDb.collection('influencers').doc(influencerId).update({
        ...data,
        updatedAt: new Date()
      });
      
      return NextResponse.json({ success: true, message: 'Influencer updated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating influencer:', error);
    return NextResponse.json(
      { error: 'Failed to update influencer', details: error.message },
      { status: 500 }
    );
  }
}
