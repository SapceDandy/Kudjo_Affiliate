import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { payoutSystem } from '@/lib/services/payout-system';
import { z } from 'zod';

const processSchema = z.object({
  payoutId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'cancel']),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  const authResult = await requireRole('admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { payoutId, action, notes } = processSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const payoutRef = adminDb!.collection('payouts').doc(payoutId);
    const payoutDoc = await payoutRef.get();

    if (!payoutDoc.exists) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    const payout = payoutDoc.data()!;
    const now = new Date();

    switch (action) {
      case 'approve':
        if (payout.status !== 'pending') {
          return NextResponse.json({ 
            error: `Cannot approve payout with status: ${payout.status}` 
          }, { status: 400 });
        }

        const result = await payoutSystem.processPayoutRequest(payoutId, authResult.user.uid);
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: 'Payout approved and processed successfully',
            payoutId
          });
        } else {
          return NextResponse.json({
            success: false,
            error: result.error
          }, { status: 400 });
        }

      case 'reject':
        if (payout.status !== 'pending') {
          return NextResponse.json({ 
            error: `Cannot reject payout with status: ${payout.status}` 
          }, { status: 400 });
        }

        await payoutRef.update({
          status: 'cancelled',
          cancelledAt: now,
          notes: notes || 'Rejected by admin',
          updatedAt: now
        });

        // Reverse the payout ledger entry
        const balance = await payoutSystem.calculateInfluencerBalance(payout.influencerId);
        await adminDb!.collection('ledgerEntries').add({
          influencerId: payout.influencerId,
          type: 'adjustment',
          amountCents: payout.amountCents, // Positive to restore balance
          currency: 'USD',
          description: `Payout rejection reversal for ${payoutId}`,
          payoutId,
          runningBalanceCents: balance.availableBalanceCents + payout.amountCents,
          transactionDate: now,
          createdAt: now,
          createdBy: authResult.user.uid
        });

        return NextResponse.json({
          success: true,
          message: 'Payout rejected successfully',
          payoutId
        });

      case 'cancel':
        if (!['pending', 'processing'].includes(payout.status)) {
          return NextResponse.json({ 
            error: `Cannot cancel payout with status: ${payout.status}` 
          }, { status: 400 });
        }

        await payoutRef.update({
          status: 'cancelled',
          cancelledAt: now,
          notes: notes || 'Cancelled by admin',
          updatedAt: now
        });

        return NextResponse.json({
          success: true,
          message: 'Payout cancelled successfully',
          payoutId
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing payout:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process payout', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
