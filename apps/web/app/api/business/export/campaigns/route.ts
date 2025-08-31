import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
  businessId: z.string().min(1),
  format: z.enum(['csv', 'json']).default('csv'),
  status: z.enum(['active', 'paused', 'completed', 'all']).default('all')
});

export async function GET(request: NextRequest) {
  const authResult = await requireRole('business', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { businessId, format, status } = querySchema.parse({
      businessId: searchParams.get('businessId'),
      format: searchParams.get('format'),
      status: searchParams.get('status')
    });

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get offers for this business
    let offersQuery = adminDb.collection('offers')
      .where('bizId', '==', businessId);

    if (status !== 'all') {
      offersQuery = offersQuery.where('status', '==', status);
    }

    const offersSnapshot = await offersQuery.get();

    // Get redemption data for each offer
    const campaignData = await Promise.all(
      offersSnapshot.docs.map(async (offerDoc) => {
        const offer = offerDoc.data();
        const offerId = offerDoc.id;

        // Get redemptions for this offer
        const redemptionsSnapshot = await adminDb.collection('redemptions')
          .where('offerId', '==', offerId)
          .get();

        // Calculate metrics
        let totalRevenue = 0;
        let totalEarnings = 0;
        let conversions = 0;
        const uniqueInfluencers = new Set<string>();

        redemptionsSnapshot.docs.forEach(doc => {
          const redemption = doc.data();
          const amount = redemption.amountCents || 0;
          const splitPct = redemption.splitPct || offer.splitPct || 20;
          const earnings = Math.round(amount * (splitPct / 100));

          totalRevenue += amount;
          totalEarnings += earnings;
          conversions += 1;

          if (redemption.influencerId) {
            uniqueInfluencers.add(redemption.influencerId);
          }
        });

        // Calculate performance metrics
        const budgetCents = offer.budgetCents || 0;
        const spendRate = budgetCents > 0 ? (totalEarnings / budgetCents) * 100 : 0;
        const averageOrderValue = conversions > 0 ? (totalRevenue / 100) / conversions : 0;
        const conversionRate = uniqueInfluencers.size > 0 ? (conversions / uniqueInfluencers.size) * 100 : 0;

        return {
          campaignId: offerId,
          campaignName: offer.title || 'Untitled Campaign',
          status: offer.status || 'active',
          discountType: offer.discountType || 'percentage',
          discountValue: offer.discountValue || 0,
          splitPercentage: offer.splitPct || 20,
          budget: budgetCents / 100,
          spent: totalEarnings / 100,
          spendRate: Math.round(spendRate * 100) / 100,
          totalRevenue: totalRevenue / 100,
          conversions,
          uniqueInfluencers: uniqueInfluencers.size,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          startDate: offer.startAt?.toDate()?.toISOString().split('T')[0] || 'N/A',
          endDate: offer.endAt?.toDate()?.toISOString().split('T')[0] || 'N/A',
          createdAt: offer.createdAt?.toDate()?.toISOString().split('T')[0] || 'N/A'
        };
      })
    );

    // Sort by total revenue descending
    campaignData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    if (format === 'json') {
      return NextResponse.json({
        campaigns: campaignData,
        summary: {
          totalCampaigns: campaignData.length,
          totalBudget: campaignData.reduce((sum, c) => sum + c.budget, 0),
          totalSpent: campaignData.reduce((sum, c) => sum + c.spent, 0),
          totalRevenue: campaignData.reduce((sum, c) => sum + c.totalRevenue, 0),
          totalConversions: campaignData.reduce((sum, c) => sum + c.conversions, 0),
          totalInfluencers: campaignData.reduce((sum, c) => sum + c.uniqueInfluencers, 0)
        },
        exportedAt: new Date().toISOString()
      });
    }

    // Generate CSV
    const csvHeaders = [
      'Campaign ID',
      'Campaign Name',
      'Status',
      'Discount Type',
      'Discount Value',
      'Split %',
      'Budget ($)',
      'Spent ($)',
      'Spend Rate (%)',
      'Total Revenue ($)',
      'Conversions',
      'Unique Influencers',
      'Avg Order Value ($)',
      'Conversion Rate (%)',
      'Start Date',
      'End Date',
      'Created At'
    ];

    const csvRows = campaignData.map(c => [
      c.campaignId,
      c.campaignName,
      c.status,
      c.discountType,
      c.discountValue.toString(),
      c.splitPercentage.toString(),
      c.budget.toFixed(2),
      c.spent.toFixed(2),
      c.spendRate.toFixed(2),
      c.totalRevenue.toFixed(2),
      c.conversions.toString(),
      c.uniqueInfluencers.toString(),
      c.averageOrderValue.toFixed(2),
      c.conversionRate.toFixed(2),
      c.startDate,
      c.endDate,
      c.createdAt
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="campaigns-${businessId}-${status}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting campaigns:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export campaigns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
