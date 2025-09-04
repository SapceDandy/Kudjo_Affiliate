import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
  metric: z.enum(['revenue', 'payout', 'conversions']).default('revenue'),
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  limit: z.coerce.number().min(1).max(50).default(10)
});

export async function GET(request: NextRequest) {
  // Require admin or business role
  const authResult = await requireRole('admin', 'business')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { metric, period, limit } = querySchema.parse({
      metric: searchParams.get('metric'),
      period: searchParams.get('period'),
      limit: searchParams.get('limit')
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

    // Get redemptions within date range
    const redemptionsSnapshot = await adminDb!.collection('redemptions')
      .where('redeemedAt', '>=', startDate)
      .where('redeemedAt', '<=', endDate)
      .get();

    // Aggregate by business
    const businessMetrics = new Map<string, {
      businessId: string;
      businessName: string;
      revenue: number;
      payout: number;
      conversions: number;
    }>();

    for (const doc of redemptionsSnapshot.docs) {
      const redemption = doc.data();
      const businessId = redemption.businessId;
      
      if (!businessId) continue;

      if (!businessMetrics.has(businessId)) {
        // Get business name
        const businessDoc = await adminDb!.collection('businesses').doc(businessId).get();
        const businessName = businessDoc.exists ? 
          (businessDoc.data()?.name || businessDoc.data()?.businessName || 'Unknown Business') : 
          'Unknown Business';

        businessMetrics.set(businessId, {
          businessId,
          businessName,
          revenue: 0,
          payout: 0,
          conversions: 0
        });
      }

      const metrics = businessMetrics.get(businessId)!;
      
      // Calculate metrics
      const amount = redemption.amountCents || 0;
      const splitPct = redemption.splitPct || 20;
      const influencerPayout = Math.round(amount * (splitPct / 100));
      
      metrics.revenue += amount;
      metrics.payout += influencerPayout;
      metrics.conversions += 1;
    }

    // Convert to array and sort by selected metric
    const businesses = Array.from(businessMetrics.values())
      .sort((a, b) => {
        switch (metric) {
          case 'revenue':
            return b.revenue - a.revenue;
          case 'payout':
            return b.payout - a.payout;
          case 'conversions':
            return b.conversions - a.conversions;
          default:
            return b.revenue - a.revenue;
        }
      })
      .slice(0, limit)
      .map(business => ({
        ...business,
        // Convert cents to dollars for revenue and payout
        revenue: business.revenue / 100,
        payout: business.payout / 100
      }));

    return NextResponse.json({
      businesses,
      metric,
      period,
      totalBusinesses: businessMetrics.size,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching top businesses:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch top businesses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
