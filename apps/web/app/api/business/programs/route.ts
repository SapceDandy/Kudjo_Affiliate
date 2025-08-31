import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    // Query active programs (redemptions grouped by influencer + offer)
    const redemptionsRef = adminDb.collection('redemptions');
    const redemptionsQuery = redemptionsRef
      .where('bizId', '==', businessId)
      .orderBy('createdAt', 'desc');

    const redemptionsSnapshot = await redemptionsQuery.get();
    
    // Group redemptions by influencer + offer
    const programsMap: Record<string, any> = {};
    
    redemptionsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      const infId = data.infId;
      const offerId = data.offerId;
      const key = `${infId}-${offerId}`;
      
      if (!programsMap[key]) {
        programsMap[key] = {
          id: key,
          influencer: data.influencerName || `Influencer ${infId?.slice(-4) || 'Unknown'}`,
          offerTitle: data.offerTitle || 'Unknown Offer',
          redemptions: 0,
          payoutCents: 0,
          since: data.createdAt?.toDate?.() || new Date(),
          infId,
          offerId
        };
      }
      
      programsMap[key].redemptions += 1;
      programsMap[key].payoutCents += data.infEarnings || 0;
      
      // Update 'since' to earliest date
      const createdAt = data.createdAt?.toDate?.() || new Date();
      if (createdAt < programsMap[key].since) {
        programsMap[key].since = createdAt;
      }
    });

    const programs = Object.values(programsMap)
      .sort((a: any, b: any) => b.redemptions - a.redemptions)
      .slice(offset, offset + limit);

    const hasMore = Object.keys(programsMap).length > offset + limit;
    const nextOffset = hasMore ? offset + limit : null;

    return NextResponse.json({
      programs,
      hasMore,
      nextOffset
    });

  } catch (error) {
    console.error('Error fetching business programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, programIds, action } = body;
    
    if (!businessId || !programIds || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'payout') {
      // Create payout records for selected programs
      const batch = adminDb.batch();
      
      for (const programId of programIds) {
        const payoutRef = adminDb.collection('payouts').doc();
        batch.set(payoutRef, {
          bizId: businessId,
          programId,
          status: 'pending',
          createdAt: new Date(),
          processedAt: null
        });
      }
      
      await batch.commit();
      
      return NextResponse.json({ success: true, message: 'Payouts initiated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error processing programs action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
