import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { mockMetrics, shouldUseMockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    // Get influencer ID from query params for now (in production, use session)
    const { searchParams } = new URL(request.url);
    const influencerId = searchParams.get('influencerId');
    const mockMode = searchParams.get('mock') === 'true';
    
    if (!influencerId) {
      return NextResponse.json({ error: 'influencerId required' }, { status: 400 });
    }

    // Use mock data if quota exceeded or in development
    if (mockMode || shouldUseMockData()) {
      return NextResponse.json({
        ...mockMetrics.influencer,
        totalEarnings: Math.round(mockMetrics.influencer.totalEarnings * 100), // Convert to cents
        weeklyEarnings: Math.round(mockMetrics.influencer.earningsThisMonth * 100 / 4), // Estimate weekly
        tier: 'Gold',
        followers: 45000,
        source: 'mock'
      });
    }

    // Query user's redemptions for earnings
    const redemptionsRef = adminDb!.collection('redemptions');
    const redemptionsQuery = redemptionsRef.where('infId', '==', influencerId);
    const redemptionsSnapshot = await redemptionsQuery.get();

    let totalEarnings = 0;
    let weeklyEarnings = 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    redemptionsSnapshot.forEach((doc: any) => {
      const data = doc.data();
      const earnings = data.infEarnings || 0;
      totalEarnings += earnings;
      
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
      if (createdAt >= weekAgo) {
        weeklyEarnings += earnings;
      }
    });

    // Query active campaigns (content coupons with CONTENT_MEAL type)
    const couponsRef = adminDb!.collection('coupons');
    const activeCouponsQuery = couponsRef
      .where('infId', '==', influencerId)
      .where('type', '==', 'CONTENT_MEAL')
      .where('status', '==', 'active');
    const activeCouponsSnapshot = await activeCouponsQuery.get();
    const activeCampaigns = activeCouponsSnapshot.size;

    // Query total redemptions count
    const totalRedemptions = redemptionsSnapshot.size;

    // Calculate conversion rate (redemptions / affiliate links created)
    const affiliateLinksRef = adminDb!.collection('affiliateLinks');
    const affiliateLinksQuery = affiliateLinksRef.where('infId', '==', influencerId);
    const affiliateLinksSnapshot = await affiliateLinksQuery.get();
    const totalLinks = affiliateLinksSnapshot.size;
    const conversionRate = totalLinks > 0 ? Math.round((totalRedemptions / totalLinks) * 100) : 0;

    // Count unique businesses worked with
    const businessIds = new Set();
    redemptionsSnapshot.forEach((doc: any) => {
      const bizId = doc.data().bizId;
      if (bizId) businessIds.add(bizId);
    });
    const partnerBusinesses = businessIds.size;

    // Get influencer profile for tier/followers
    const influencerDoc = await adminDb!.collection('influencers').doc(influencerId).get();
    const influencerData = influencerDoc.data();
    const tier = influencerData?.tier || 'Small';
    const followers = influencerData?.followers || 0;

    // Mock pending requests count (would need requests collection)
    const pendingRequests = 2;

    return NextResponse.json({
      totalEarnings,
      weeklyEarnings,
      activeCampaigns,
      totalRedemptions,
      conversionRate,
      partnerBusinesses,
      pendingRequests,
      tier,
      followers
    });

  } catch (error: any) {
    console.error('Error fetching influencer metrics:', error);
    
    // Handle quota exceeded errors with mock data fallback
    if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
      console.log('Quota exceeded, falling back to mock data');
      return NextResponse.json({
        ...mockMetrics.influencer,
        totalEarnings: Math.round(mockMetrics.influencer.totalEarnings * 100), // Convert to cents
        weeklyEarnings: Math.round(mockMetrics.influencer.earningsThisMonth * 100 / 4), // Estimate weekly
        tier: 'Gold',
        followers: 45000,
        source: 'mock_fallback'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
