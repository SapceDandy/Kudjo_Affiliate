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

    let query: FirebaseFirestore.Query = adminDb.collection('businesses');
    
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const businesses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const paginatedBusinesses = businesses.slice(offset, offset + limit);

    return NextResponse.json({
      businesses: paginatedBusinesses,
      total: businesses.length,
      hasMore: offset + paginatedBusinesses.length < businesses.length
    });
  } catch (error: any) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, data } = body;

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    if (action === 'approve') {
      await adminDb.collection('businesses').doc(businessId).update({
        status: 'approved',
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      return NextResponse.json({ success: true, message: 'Business approved' });
    }

    if (action === 'reject') {
      await adminDb.collection('businesses').doc(businessId).update({
        status: 'rejected',
        rejectedAt: new Date(),
        updatedAt: new Date()
      });
      
      return NextResponse.json({ success: true, message: 'Business rejected' });
    }

    if (action === 'update') {
      await adminDb.collection('businesses').doc(businessId).update({
        ...data,
        updatedAt: new Date()
      });
      
      return NextResponse.json({ success: true, message: 'Business updated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Failed to update business', details: error.message },
      { status: 500 }
    );
  }
}
