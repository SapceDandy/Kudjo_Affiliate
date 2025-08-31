import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get business ID from query params for now (in production, use session)
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const mockMode = searchParams.get('mock') === 'true';
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    if (mockMode) {
      return NextResponse.json({
        totalPayoutOwed: 19450, // cents
        totalRedemptions: 52,
        activeOffers: 2,
        pendingRequests: 2,
        totalRevenue: 78200, // cents
        avgOrderValue: 1504, // cents
        topInfluencers: [
          { name: 'AustinEats', redemptions: 34, payout: 12250 },
          { name: 'BBQQuest', redemptions: 18, payout: 7200 }
        ]
      });
    }

    // Query business's offers
    const offersRef = adminDb.collection('offers');
    const offersQuery = offersRef.where('bizId', '==', businessId);
    const offersSnapshot = await offersQuery.get();
    
    const activeOffers = offersSnapshot.docs.filter((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return data.active === true;
    }).length;

    // Query redemptions for this business
    const redemptionsRef = adminDb.collection('redemptions');
    const redemptionsQuery = redemptionsRef.where('bizId', '==', businessId);
    const redemptionsSnapshot = await redemptionsQuery.get();

    let totalPayoutOwed = 0;
    let totalRevenue = 0;
    const influencerStats: Record<string, { redemptions: number; payout: number; name?: string }> = {};

    redemptionsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      const infEarnings = data.infEarnings || 0;
      const orderValue = data.orderValueCents || 0;
      const infId = data.infId;

      totalPayoutOwed += infEarnings;
      totalRevenue += orderValue;

      if (infId) {
        if (!influencerStats[infId]) {
          influencerStats[infId] = { redemptions: 0, payout: 0 };
        }
        influencerStats[infId].redemptions += 1;
        influencerStats[infId].payout += infEarnings;
      }
    });

    const totalRedemptions = redemptionsSnapshot.size;
    const avgOrderValue = totalRedemptions > 0 ? Math.round(totalRevenue / totalRedemptions) : 0;

    // Query pending requests for this business
    const requestsRef = adminDb.collection('influencerRequests');
    const requestsQuery = requestsRef.where('bizId', '==', businessId).where('status', '==', 'pending');
    const requestsSnapshot = await requestsQuery.get();
    const pendingRequests = requestsSnapshot.size;

    // Get top influencers (limit to top 5) with actual names
    const topInfluencersData = await Promise.all(
      Object.entries(influencerStats)
        .sort(([,a], [,b]) => b.redemptions - a.redemptions)
        .slice(0, 5)
        .map(async ([infId, stats]) => {
          try {
            const influencerDoc = await adminDb.collection('influencers').doc(infId).get();
            const influencerData = influencerDoc.data();
            return {
              name: influencerData?.handle || `Influencer ${infId.slice(-4)}`,
              redemptions: stats.redemptions,
              payout: stats.payout
            };
          } catch {
            return {
              name: `Influencer ${infId.slice(-4)}`,
              redemptions: stats.redemptions,
              payout: stats.payout
            };
          }
        })
    );

    return NextResponse.json({
      totalPayoutOwed,
      totalRedemptions,
      activeOffers,
      pendingRequests,
      totalRevenue,
      avgOrderValue,
      topInfluencers: topInfluencersData
    });

  } catch (error) {
    console.error('Error fetching business metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
