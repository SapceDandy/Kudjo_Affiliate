import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  businessId: z.string().optional()
});

export async function GET(request: NextRequest) {
  const authResult = await requireRole('admin', 'business')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { period, businessId } = querySchema.parse({
      period: searchParams.get('period'),
      businessId: searchParams.get('businessId')
    });

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Build query for redemptions
    let redemptionsQuery = adminDb.collection('redemptions')
      .where('redeemedAt', '>=', startDate)
      .where('redeemedAt', '<=', endDate);

    if (businessId) {
      redemptionsQuery = redemptionsQuery.where('businessId', '==', businessId);
    }

    const redemptionsSnapshot = await redemptionsQuery.get();

    // Get unique influencer IDs from redemptions
    const influencerIds = new Set<string>();
    redemptionsSnapshot.docs.forEach(doc => {
      const influencerId = doc.data().influencerId;
      if (influencerId) {
        influencerIds.add(influencerId);
      }
    });

    // Get influencer tiers
    const tierCounts = new Map<string, { count: number; revenue: number; conversions: number }>();
    const tierLabels = {
      'S': 'Nano (1K-10K)',
      'M': 'Micro (10K-100K)', 
      'L': 'Macro (100K-1M)',
      'XL': 'Mega (1M+)',
      'Huge': 'Celebrity (10M+)'
    };

    // Initialize tier counts
    Object.keys(tierLabels).forEach(tier => {
      tierCounts.set(tier, { count: 0, revenue: 0, conversions: 0 });
    });

    // Process influencers in batches to avoid Firestore limits
    const influencerIdsArray = Array.from(influencerIds);
    for (let i = 0; i < influencerIdsArray.length; i += 30) {
      const batch = influencerIdsArray.slice(i, i + 30);
      
      const influencersSnapshot = await adminDb.collection('influencers')
        .where('__name__', 'in', batch)
        .get();

      influencersSnapshot.docs.forEach(doc => {
        const influencer = doc.data();
        const tier = influencer.tier || 'S';
        const influencerId = doc.id;

        if (tierCounts.has(tier)) {
          const tierData = tierCounts.get(tier)!;
          tierData.count += 1;

          // Calculate revenue and conversions for this influencer
          redemptionsSnapshot.docs.forEach(redemptionDoc => {
            const redemption = redemptionDoc.data();
            if (redemption.influencerId === influencerId) {
              tierData.revenue += redemption.amountCents || 0;
              tierData.conversions += 1;
            }
          });
        }
      });
    }

    // Format response
    const tierMix = Array.from(tierCounts.entries()).map(([tier, data]) => ({
      tier,
      label: tierLabels[tier as keyof typeof tierLabels] || tier,
      count: data.count,
      revenue: data.revenue / 100, // Convert cents to dollars
      conversions: data.conversions,
      percentage: influencerIds.size > 0 ? Math.round((data.count / influencerIds.size) * 100) : 0
    })).filter(item => item.count > 0); // Only include tiers with active influencers

    return NextResponse.json({
      tierMix,
      period,
      totalInfluencers: influencerIds.size,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching tier mix:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch tier mix', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
