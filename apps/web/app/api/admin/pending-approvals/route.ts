import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuth(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const { db } = await initializeFirebaseAdmin();

    // Get pending businesses (without orderBy to avoid index requirement)
    const businessesSnapshot = await db.collection('businesses')
      .where('approvalStatus', '==', 'pending')
      .limit(50)
      .get();

    // Get pending influencers (without orderBy to avoid index requirement)
    const influencersSnapshot = await db.collection('influencers')
      .where('approvalStatus', '==', 'pending')
      .limit(50)
      .get();

    const pendingBusinesses = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'business' as const,
      ...doc.data(),
    }));

    const pendingInfluencers = influencersSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'influencer' as const,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        businesses: pendingBusinesses,
        influencers: pendingInfluencers,
        totalPending: pendingBusinesses.length + pendingInfluencers.length,
      },
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pending approvals',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
        }
      },
      { status: 500 }
    );
  }
}
