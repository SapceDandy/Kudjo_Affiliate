import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { mockCampaigns, paginateMockData, shouldUseMockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/business/programs - Starting request');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log('Request params:', { businessId, limit, offset });
    
    if (!businessId) {
      console.log('Missing businessId parameter');
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    // Use mock data if quota exceeded or in development
    if (shouldUseMockData()) {
      console.log('Using mock data due to shouldUseMockData() = true');
      const businessPrograms = mockCampaigns.filter(campaign => campaign.businessId === businessId);
      const result = paginateMockData(businessPrograms, Math.floor(offset / limit) + 1, limit);
      
      return NextResponse.json({
        programs: result.data.map(campaign => ({
          id: campaign.id,
          influencer: `Influencer ${campaign.id.slice(-4)}`,
          offerTitle: campaign.title,
          redemptions: campaign.totalRedemptions,
          payoutCents: Math.round(campaign.spent * 100),
          since: campaign.startDate,
          infId: `inf-${campaign.id}`,
          offerId: `offer-${campaign.id}`
        })),
        hasMore: result.pagination.hasNext,
        nextOffset: result.pagination.hasNext ? offset + limit : null,
        source: 'mock'
      });
    }

    // Query active programs (redemptions grouped by influencer + offer)
    if (!adminDb) {
      console.log('adminDb is null, falling back to mock data');
      // Fallback to mock data when Firebase is not configured
      const businessPrograms = mockCampaigns.filter(campaign => campaign.businessId === businessId);
      const result = paginateMockData(businessPrograms, Math.floor(offset / limit) + 1, limit);
      
      return NextResponse.json({
        programs: result.data.map(campaign => ({
          id: campaign.id,
          influencer: `Influencer ${campaign.id.slice(-4)}`,
          offerTitle: campaign.title,
          redemptions: campaign.totalRedemptions,
          payoutCents: Math.round(campaign.spent * 100),
          since: campaign.startDate,
          infId: `inf-${campaign.id}`,
          offerId: `offer-${campaign.id}`
        })),
        hasMore: result.pagination.hasNext,
        nextOffset: result.pagination.hasNext ? offset + limit : null,
        source: 'mock_firebase_not_configured'
      });
    }

    console.log('Querying Firebase for redemptions...');
    const redemptionsRef = adminDb!.collection('redemptions');
    const redemptionsQuery = redemptionsRef
      .where('bizId', '==', businessId);

    const redemptionsSnapshot = await redemptionsQuery.get();
    console.log('Found redemptions:', redemptionsSnapshot.size);
    
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

    console.log('Returning programs:', programs.length);
    return NextResponse.json({
      programs,
      hasMore,
      nextOffset
    });

  } catch (error: any) {
    console.error('Error fetching business programs:', error);
    console.error('Error stack:', error.stack);
    
    // Handle quota exceeded errors with mock data fallback
    if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
      console.log('Quota exceeded, falling back to mock data');
      
      const { searchParams } = new URL(request.url);
      const businessId = searchParams.get('businessId');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      const businessPrograms = mockCampaigns.filter(campaign => campaign.businessId === businessId);
      const result = paginateMockData(businessPrograms, Math.floor(offset / limit) + 1, limit);
      
      return NextResponse.json({
        programs: result.data.map(campaign => ({
          id: campaign.id,
          influencer: `Influencer ${campaign.id.slice(-4)}`,
          offerTitle: campaign.title,
          redemptions: campaign.totalRedemptions,
          payoutCents: Math.round(campaign.spent * 100),
          since: campaign.startDate,
          infId: `inf-${campaign.id}`,
          offerId: `offer-${campaign.id}`
        })),
        hasMore: result.pagination.hasNext,
        nextOffset: result.pagination.hasNext ? offset + limit : null,
        source: 'mock_fallback'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch programs', details: error.message },
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
      const batch = adminDb!.batch();
      
      for (const programId of programIds) {
        const payoutRef = adminDb!.collection('payouts').doc();
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
      { error: 'Failed to process action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
