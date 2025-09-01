import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const querySchema = z.object({
  businessId: z.string().min(1),
  format: z.enum(['csv', 'json']).default('csv'),
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d')
});

export async function GET(request: NextRequest) {
  const authResult = await requireRole('business', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { businessId, format, period } = querySchema.parse({
      businessId: searchParams.get('businessId'),
      format: searchParams.get('format'),
      period: searchParams.get('period')
    });

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Calculate date range if not 'all'
    let startDate: Date | null = null;
    if (period !== 'all') {
      const endDate = new Date();
      startDate = new Date();
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
    }

    // Get redemptions for this business
    let redemptionsQuery = adminDb.collection('redemptions')
      .where('businessId', '==', businessId);

    if (startDate) {
      redemptionsQuery = redemptionsQuery.where('redeemedAt', '>=', startDate);
    }

    const redemptionsSnapshot = await redemptionsQuery.get();

    // Get unique influencer IDs
    const influencerIds = new Set<string>();
    redemptionsSnapshot.docs.forEach((doc: any) => {
      const influencerId = doc.data().influencerId;
      if (influencerId) {
        influencerIds.add(influencerId);
      }
    });

    // Get influencer details in batches
    const influencerData = new Map<string, any>();
    const influencerIdsArray = Array.from(influencerIds);
    
    for (let i = 0; i < influencerIdsArray.length; i += 30) {
      const batch = influencerIdsArray.slice(i, i + 30);
      const influencersSnapshot = await adminDb.collection('influencers')
        .where('__name__', 'in', batch)
        .get();

        influencersSnapshot.docs.forEach((doc: any) => {
        influencerData.set(doc.id, doc.data());
      });
    }

    // Aggregate partnership data
    const partnerships = new Map<string, {
      influencerId: string;
      influencerName: string;
      influencerHandle: string;
      tier: string;
      totalRevenue: number;
      totalEarnings: number;
      conversions: number;
      averageOrderValue: number;
      firstPartnership: Date;
      lastActivity: Date;
    }>();

    redemptionsSnapshot.docs.forEach((doc: any) => {
      const redemption = doc.data();
      const influencerId = redemption.influencerId;
      
      if (!influencerId) return;

      if (!partnerships.has(influencerId)) {
        const influencer = influencerData.get(influencerId) || {};
        partnerships.set(influencerId, {
          influencerId,
          influencerName: influencer.name || influencer.displayName || 'Unknown',
          influencerHandle: influencer.handle || influencer.username || '@unknown',
          tier: influencer.tier || 'S',
          totalRevenue: 0,
          totalEarnings: 0,
          conversions: 0,
          averageOrderValue: 0,
          firstPartnership: redemption.redeemedAt?.toDate() || new Date(),
          lastActivity: redemption.redeemedAt?.toDate() || new Date()
        });
      }

      const partnership = partnerships.get(influencerId)!;
      const amount = redemption.amountCents || 0;
      const splitPct = redemption.splitPct || 20;
      const earnings = Math.round(amount * (splitPct / 100));

      partnership.totalRevenue += amount;
      partnership.totalEarnings += earnings;
      partnership.conversions += 1;

      const redemptionDate = redemption.redeemedAt?.toDate() || new Date();
      if (redemptionDate < partnership.firstPartnership) {
        partnership.firstPartnership = redemptionDate;
      }
      if (redemptionDate > partnership.lastActivity) {
        partnership.lastActivity = redemptionDate;
      }
    });

    // Calculate average order values and convert to final format
    const partnershipData = Array.from(partnerships.values()).map(p => ({
      ...p,
      totalRevenue: p.totalRevenue / 100, // Convert cents to dollars
      totalEarnings: p.totalEarnings / 100,
      averageOrderValue: p.conversions > 0 ? (p.totalRevenue / 100) / p.conversions : 0,
      firstPartnership: p.firstPartnership.toISOString().split('T')[0],
      lastActivity: p.lastActivity.toISOString().split('T')[0]
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    if (format === 'json') {
      return NextResponse.json({
        partnerships: partnershipData,
        summary: {
          totalPartnerships: partnershipData.length,
          totalRevenue: partnershipData.reduce((sum, p) => sum + p.totalRevenue, 0),
          totalEarnings: partnershipData.reduce((sum, p) => sum + p.totalEarnings, 0),
          totalConversions: partnershipData.reduce((sum, p) => sum + p.conversions, 0)
        },
        period,
        exportedAt: new Date().toISOString()
      });
    }

    // Generate CSV
    const csvHeaders = [
      'Influencer ID',
      'Name',
      'Handle',
      'Tier',
      'Total Revenue ($)',
      'Total Earnings ($)',
      'Conversions',
      'Average Order Value ($)',
      'First Partnership',
      'Last Activity'
    ];

    const csvRows = partnershipData.map(p => [
      p.influencerId,
      p.influencerName,
      p.influencerHandle,
      p.tier,
      p.totalRevenue.toFixed(2),
      p.totalEarnings.toFixed(2),
      p.conversions.toString(),
      p.averageOrderValue.toFixed(2),
      p.firstPartnership,
      p.lastActivity
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="partnerships-${businessId}-${period}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting partnerships:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export partnerships', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
