import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subDays, format } from 'date-fns';

interface RouteParams {
  params: {
    couponId: string;
  };
}

export async function GET(
  request: NextRequest, 
  { params }: RouteParams
) {
  try {
    const { couponId } = params;

    // Verify coupon exists
    const couponDoc = await getDoc(doc(db, 'coupons', couponId));
    if (!couponDoc.exists()) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Parse query parameters for date range
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    // Fetch usage stats from couponStatsDaily
    // Query for documents matching pattern: {couponId}_{YYYYMMDD}
    const statsQuery = query(
      collection(db, 'couponStatsDaily'),
      where('couponId', '==', couponId),
      where('date', '>=', startDate),
      orderBy('date', 'asc')
    );

    const statsSnapshot = await getDocs(statsQuery);
    const usageData = statsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        date: data.date,
        uses: data.uses || 0,
        revenue_cents: data.revenue_cents || 0,
        payouts_cents: data.payouts_cents || 0,
      };
    });

    // Fill in missing dates with zero values
    const completeUsageData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const existingData = usageData.find(d => d.date === date);
      
      completeUsageData.push({
        date,
        uses: existingData?.uses || 0,
        revenue_cents: existingData?.revenue_cents || 0,
        payouts_cents: existingData?.payouts_cents || 0,
      });
    }

    // Fetch recent redemptions
    const redemptionsQuery = query(
      collection(db, 'redemptions'),
      where('couponId', '==', couponId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const redemptionsSnapshot = await getDocs(redemptionsQuery);
    const redemptions = redemptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate summary metrics
    const totalUses = completeUsageData.reduce((sum, day) => sum + day.uses, 0);
    const totalRevenue = completeUsageData.reduce((sum, day) => sum + day.revenue_cents, 0);
    const totalPayouts = completeUsageData.reduce((sum, day) => sum + day.payouts_cents, 0);
    const averageOrderValue = totalUses > 0 ? totalRevenue / totalUses : 0;

    // Calculate trends (comparing last 7 days to previous 7 days)
    const recentData = completeUsageData.slice(-7);
    const previousData = completeUsageData.slice(-14, -7);
    
    const recentUses = recentData.reduce((sum, day) => sum + day.uses, 0);
    const previousUses = previousData.reduce((sum, day) => sum + day.uses, 0);
    const usagesTrend = previousUses > 0 ? ((recentUses - previousUses) / previousUses) * 100 : 0;

    const recentRevenue = recentData.reduce((sum, day) => sum + day.revenue_cents, 0);
    const previousRevenue = previousData.reduce((sum, day) => sum + day.revenue_cents, 0);
    const revenueTrend = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return NextResponse.json({
      couponId,
      period: {
        days,
        startDate,
        endDate: format(new Date(), 'yyyy-MM-dd'),
      },
      usageData: completeUsageData,
      redemptions,
      summary: {
        totalUses,
        totalRevenue,
        totalPayouts,
        averageOrderValue,
        trends: {
          usagesTrend: Math.round(usagesTrend * 100) / 100,
          revenueTrend: Math.round(revenueTrend * 100) / 100,
        },
      },
    });

  } catch (error) {
    console.error('Coupon stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 