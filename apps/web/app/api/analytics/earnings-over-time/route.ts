import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  influencerId: z.string().optional(),
  businessId: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily')
});

export async function GET(request: NextRequest) {
  const authResult = await requireRole('admin', 'business', 'influencer')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { period, influencerId, businessId, granularity } = querySchema.parse({
      period: searchParams.get('period'),
      influencerId: searchParams.get('influencerId'),
      businessId: searchParams.get('businessId'),
      granularity: searchParams.get('granularity')
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
    let redemptionsQuery = adminDb!.collection('redemptions')
      .where('redeemedAt', '>=', startDate)
      .where('redeemedAt', '<=', endDate);

    if (influencerId) {
      redemptionsQuery = redemptionsQuery.where('influencerId', '==', influencerId);
    }
    if (businessId) {
      redemptionsQuery = redemptionsQuery.where('businessId', '==', businessId);
    }

    const redemptionsSnapshot = await redemptionsQuery.get();

    // Group earnings by time period
    const timeGroups = new Map<string, {
      earnings: number;
      conversions: number;
      revenue: number;
      date: string;
    }>();

    redemptionsSnapshot.docs.forEach((doc: any) => {
      const redemption = doc.data();
      const redemptionDate = redemption.redeemedAt?.toDate() || new Date();
      
      // Create time key based on granularity
      let timeKey: string;
      let displayDate: string;
      
      switch (granularity) {
        case 'daily':
          timeKey = redemptionDate.toISOString().split('T')[0];
          displayDate = timeKey;
          break;
        case 'weekly':
          const weekStart = new Date(redemptionDate);
          weekStart.setDate(redemptionDate.getDate() - redemptionDate.getDay());
          timeKey = weekStart.toISOString().split('T')[0];
          displayDate = `Week of ${timeKey}`;
          break;
        case 'monthly':
          timeKey = `${redemptionDate.getFullYear()}-${String(redemptionDate.getMonth() + 1).padStart(2, '0')}`;
          displayDate = new Date(redemptionDate.getFullYear(), redemptionDate.getMonth(), 1)
            .toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
          break;
        default:
          timeKey = redemptionDate.toISOString().split('T')[0];
          displayDate = timeKey;
      }

      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, {
          earnings: 0,
          conversions: 0,
          revenue: 0,
          date: displayDate
        });
      }

      const group = timeGroups.get(timeKey)!;
      const amount = redemption.amountCents || 0;
      const splitPct = redemption.splitPct || 20;
      const influencerEarnings = Math.round(amount * (splitPct / 100));
      
      group.earnings += influencerEarnings;
      group.revenue += amount;
      group.conversions += 1;
    });

    // Convert to array and sort by date
    const earningsData = Array.from(timeGroups.values())
      .sort((a, b) => {
        // Extract sortable date from display date
        const aDate = a.date.includes('Week of') ? a.date.replace('Week of ', '') : a.date;
        const bDate = b.date.includes('Week of') ? b.date.replace('Week of ', '') : b.date;
        return aDate.localeCompare(bDate);
      })
      .map(group => ({
        date: group.date,
        earnings: group.earnings / 100, // Convert cents to dollars
        revenue: group.revenue / 100, // Convert cents to dollars
        conversions: group.conversions,
        averageEarningsPerConversion: group.conversions > 0 ? 
          Math.round((group.earnings / group.conversions) / 100 * 100) / 100 : 0
      }));

    // Calculate summary metrics
    const totalEarnings = earningsData.reduce((sum, item) => sum + item.earnings, 0);
    const totalRevenue = earningsData.reduce((sum, item) => sum + item.revenue, 0);
    const totalConversions = earningsData.reduce((sum, item) => sum + item.conversions, 0);
    const averageEarningsPerConversion = totalConversions > 0 ? totalEarnings / totalConversions : 0;

    // Calculate growth rate (comparing first and last periods)
    let growthRate = 0;
    if (earningsData.length >= 2) {
      const firstPeriod = earningsData[0].earnings;
      const lastPeriod = earningsData[earningsData.length - 1].earnings;
      if (firstPeriod > 0) {
        growthRate = ((lastPeriod - firstPeriod) / firstPeriod) * 100;
      }
    }

    return NextResponse.json({
      earningsData,
      summary: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalConversions,
        averageEarningsPerConversion: Math.round(averageEarningsPerConversion * 100) / 100,
        growthRate: Math.round(growthRate * 100) / 100
      },
      period,
      granularity,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching earnings data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch earnings data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
