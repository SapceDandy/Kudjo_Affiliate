import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  businessId: z.string().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily')
});

export async function GET(request: NextRequest) {
  const authResult = await requireRole('admin', 'business')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { period, businessId, granularity } = querySchema.parse({
      period: searchParams.get('period'),
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

    // Get redemptions and offers data
    let redemptionsQuery = adminDb.collection('redemptions')
      .where('redeemedAt', '>=', startDate)
      .where('redeemedAt', '<=', endDate);

    if (businessId) {
      redemptionsQuery = redemptionsQuery.where('businessId', '==', businessId);
    }

    const [redemptionsSnapshot, offersSnapshot] = await Promise.all([
      redemptionsQuery.get(),
      businessId 
        ? adminDb.collection('offers').where('bizId', '==', businessId).get()
        : adminDb.collection('offers').get()
    ]);

    // Calculate ad spend (estimated based on offer budgets)
    let totalAdSpend = 0;
    const offerBudgets = new Map<string, number>();
    
    offersSnapshot.docs.forEach(doc => {
      const offer = doc.data();
      const budget = offer.budgetCents || 0;
      offerBudgets.set(doc.id, budget);
      totalAdSpend += budget;
    });

    // Group redemptions by time period
    const timeGroups = new Map<string, {
      revenue: number;
      adSpend: number;
      conversions: number;
      date: string;
    }>();

    redemptionsSnapshot.docs.forEach(doc => {
      const redemption = doc.data();
      const redemptionDate = redemption.redeemedAt?.toDate() || new Date();
      
      // Create time key based on granularity
      let timeKey: string;
      switch (granularity) {
        case 'daily':
          timeKey = redemptionDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(redemptionDate);
          weekStart.setDate(redemptionDate.getDate() - redemptionDate.getDay());
          timeKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          timeKey = `${redemptionDate.getFullYear()}-${String(redemptionDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          timeKey = redemptionDate.toISOString().split('T')[0];
      }

      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, {
          revenue: 0,
          adSpend: 0,
          conversions: 0,
          date: timeKey
        });
      }

      const group = timeGroups.get(timeKey)!;
      group.revenue += redemption.amountCents || 0;
      group.conversions += 1;
      
      // Estimate ad spend allocation for this redemption
      const offerId = redemption.offerId;
      if (offerId && offerBudgets.has(offerId)) {
        const offerBudget = offerBudgets.get(offerId)!;
        // Allocate ad spend proportionally based on conversions
        group.adSpend += offerBudget / Math.max(1, group.conversions);
      }
    });

    // Calculate ROAS for each time period
    const roasData = Array.from(timeGroups.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(group => {
        const revenue = group.revenue / 100; // Convert cents to dollars
        const adSpend = group.adSpend / 100; // Convert cents to dollars
        const roas = adSpend > 0 ? revenue / adSpend : 0;
        
        return {
          date: group.date,
          revenue,
          adSpend,
          roas: Math.round(roas * 100) / 100, // Round to 2 decimal places
          conversions: group.conversions
        };
      });

    // Calculate overall metrics
    const totalRevenue = roasData.reduce((sum, item) => sum + item.revenue, 0);
    const totalSpend = roasData.reduce((sum, item) => sum + item.adSpend, 0);
    const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalConversions = roasData.reduce((sum, item) => sum + item.conversions, 0);

    return NextResponse.json({
      roasData,
      summary: {
        totalRevenue,
        totalAdSpend: totalSpend,
        overallRoas: Math.round(overallRoas * 100) / 100,
        totalConversions,
        averageOrderValue: totalConversions > 0 ? totalRevenue / totalConversions : 0
      },
      period,
      granularity,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching ROAS data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch ROAS data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
