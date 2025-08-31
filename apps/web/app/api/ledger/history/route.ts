import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { payoutSystem } from '@/lib/services/payout-system';
import { z } from 'zod';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

interface LedgerEntry {
  id: string;
  influencerId: string;
  type: 'earning' | 'payout' | 'adjustment' | 'fee' | 'refund';
  amountCents: number;
  transactionDate: string;
  createdAt: string;
  description?: string;
  relatedId?: string;
  metadata?: Record<string, any>;
}

const querySchema = z.object({
  influencerId: z.string().min(1),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  type: z.enum(['earning', 'payout', 'adjustment', 'fee', 'refund']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export async function GET(request: NextRequest) {
  const authResult = await requireRole('influencer', 'admin', 'business')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { influencerId, limit, offset, type, startDate, endDate } = querySchema.parse({
      influencerId: searchParams.get('influencerId'),
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      type: searchParams.get('type'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    });

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify access
    if (authResult.user.role === 'influencer' && authResult.user.influencerId !== influencerId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    let query = adminDb.collection('ledgerEntries')
      .where('influencerId', '==', influencerId);

    if (type) {
      query = query.where('type', '==', type);
    }

    if (startDate) {
      query = query.where('transactionDate', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('transactionDate', '<=', new Date(endDate));
    }

    const snapshot = await query
      .orderBy('transactionDate', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const entries: LedgerEntry[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
      transactionDate: doc.data().transactionDate?.toDate?.()?.toISOString() || doc.data().transactionDate,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    } as LedgerEntry));

    // Get current balance
    const balance = await payoutSystem.calculateInfluencerBalance(influencerId);

    // Calculate summary for the filtered period
    const summary = {
      totalEarnings: 0,
      totalPayouts: 0,
      totalFees: 0,
      totalAdjustments: 0,
      entryCount: entries.length
    };

    entries.forEach(entry => {
      switch (entry.type) {
        case 'earning':
          summary.totalEarnings += entry.amountCents;
          break;
        case 'payout':
          summary.totalPayouts += Math.abs(entry.amountCents);
          break;
        case 'fee':
          summary.totalFees += Math.abs(entry.amountCents);
          break;
        case 'adjustment':
          summary.totalAdjustments += entry.amountCents;
          break;
      }
    });

    return NextResponse.json({
      entries,
      balance: {
        totalEarnings: balance.totalEarningsCents / 100,
        totalPayouts: balance.totalPayoutsCents / 100,
        pendingPayouts: balance.pendingPayoutsCents / 100,
        availableBalance: balance.availableBalanceCents / 100,
        currency: balance.currency,
        lastUpdated: balance.lastUpdated.toISOString()
      },
      summary: {
        totalEarnings: summary.totalEarnings / 100,
        totalPayouts: summary.totalPayouts / 100,
        totalFees: summary.totalFees / 100,
        totalAdjustments: summary.totalAdjustments / 100,
        entryCount: summary.entryCount
      },
      pagination: {
        limit,
        offset,
        hasMore: entries.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching ledger history:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch ledger history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
