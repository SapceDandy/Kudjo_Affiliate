import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { payoutSystem } from '@/lib/services/payout-system';
import { z } from 'zod';

const requestSchema = z.object({
  influencerId: z.string().min(1),
  amountCents: z.number().min(2000), // Minimum $20
  method: z.enum(['bank_transfer', 'paypal', 'stripe', 'check']),
  bankDetails: z.object({
    accountNumber: z.string().min(1),
    routingNumber: z.string().min(9).max(9),
    accountType: z.enum(['checking', 'savings']),
    bankName: z.string().min(1)
  }).optional(),
  paypalEmail: z.string().email().optional(),
  stripeAccountId: z.string().optional()
});

export async function POST(request: NextRequest) {
  const authResult = await requireRole('influencer', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { influencerId, amountCents, method, bankDetails, paypalEmail, stripeAccountId } = requestSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify influencer ownership for non-admin users
    if (authResult.user.role === 'influencer' && authResult.user.influencerId !== influencerId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate payment method details
    const paymentDetails: any = {};
    switch (method) {
      case 'bank_transfer':
        if (!bankDetails) {
          return NextResponse.json({ error: 'Bank details required for bank transfer' }, { status: 400 });
        }
        paymentDetails.bankDetails = bankDetails;
        break;
      case 'paypal':
        if (!paypalEmail) {
          return NextResponse.json({ error: 'PayPal email required' }, { status: 400 });
        }
        paymentDetails.paypalEmail = paypalEmail;
        break;
      case 'stripe':
        if (!stripeAccountId) {
          return NextResponse.json({ error: 'Stripe account ID required' }, { status: 400 });
        }
        paymentDetails.stripeAccountId = stripeAccountId;
        break;
      case 'check':
        // No additional details required for check
        break;
    }

    // Create payout request
    const result = await payoutSystem.createPayoutRequest(
      influencerId,
      amountCents,
      method,
      paymentDetails,
      authResult.user.uid
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        payoutId: result.payoutId,
        message: 'Payout request created successfully',
        amount: amountCents / 100,
        method
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error creating payout request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payout request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole('influencer', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const influencerId = searchParams.get('influencerId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify access
    let queryInfluencerId = influencerId;
    if (authResult.user.role === 'influencer') {
      queryInfluencerId = authResult.user.influencerId || null;
    }

    // Get payout history
    const payouts = await payoutSystem.getPayoutHistory(queryInfluencerId || undefined, limit, offset);

    // Get current balance if querying for specific influencer
    let balance = null;
    if (queryInfluencerId) {
      balance = await payoutSystem.calculateInfluencerBalance(queryInfluencerId);
    }

    return NextResponse.json({
      payouts: payouts.map(payout => ({
        ...payout,
        // Remove sensitive payment details from response
        bankDetails: payout.bankDetails ? { bankName: payout.bankDetails.bankName } : undefined,
        paypalEmail: payout.paypalEmail ? payout.paypalEmail.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined
      })),
      balance,
      pagination: {
        limit,
        offset,
        hasMore: payouts.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching payout requests:', error);

    return NextResponse.json(
      { error: 'Failed to fetch payout requests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
