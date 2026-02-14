import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { RequestPayoutSchema } from '@/lib/schemas/campaigns';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { influencerId, linkIds, method } = RequestPayoutSchema.parse(body);

    const { db } = await initializeFirebaseAdmin();

    // Use Firestore transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      // Get all affiliate links and calculate total pending earnings
      const affiliateLinksRef = db.collection('affiliateLinks');
      let totalPendingEarnings = 0;
      const linkUpdates: Array<{ ref: any; data: any }> = [];

      for (const linkId of linkIds) {
        const linkRef = affiliateLinksRef.doc(linkId);
        const linkDoc = await transaction.get(linkRef);
        
        if (!linkDoc.exists) {
          throw new Error(`Affiliate link ${linkId} not found`);
        }

        const linkData = linkDoc.data()!;
        
        if (linkData.influencerId !== influencerId) {
          throw new Error(`Unauthorized access to link ${linkId}`);
        }

        if (linkData.pendingEarnings <= 0) {
          throw new Error(`No pending earnings for link ${linkId}`);
        }

        totalPendingEarnings += linkData.pendingEarnings;
        
        linkUpdates.push({
          ref: linkRef,
          data: {
            pendingEarnings: 0,
            lastPayoutAt: new Date(),
            lastPayoutId: '' // Will be set after payout creation
          }
        });
      }

      if (totalPendingEarnings <= 0) {
        throw new Error('No pending earnings to payout');
      }

      // Create payout record
      const payoutsRef = db.collection('payouts');
      const payoutRef = payoutsRef.doc();
      const payoutId = payoutRef.id;

      const payoutData = {
        influencerId,
        amount: totalPendingEarnings,
        currency: 'USD',
        linkIds,
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        periodEnd: new Date(),
        method,
        status: 'pending',
        externalRef: null,
        createdAt: new Date(),
        approvedAt: null,
        paidAt: null,
        notes: `Payout request for ${linkIds.length} affiliate links`
      };

      transaction.set(payoutRef, payoutData);

      // Update affiliate links with payout info
      linkUpdates.forEach(({ ref, data }) => {
        transaction.update(ref, {
          ...data,
          lastPayoutId: payoutId
        });
      });

      return {
        payoutId,
        amount: totalPendingEarnings,
        currency: 'USD',
        status: 'pending',
        linkCount: linkIds.length
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error requesting payout:', error);
    
    if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    if (error.message.includes('No pending earnings')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to request payout' },
      { status: 500 }
    );
  }
}
