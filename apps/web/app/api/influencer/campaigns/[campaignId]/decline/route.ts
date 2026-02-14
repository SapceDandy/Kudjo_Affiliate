import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { AcceptCampaignSchema } from '@/lib/schemas/campaigns';

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const body = await request.json();
    const { influencerId } = AcceptCampaignSchema.parse({
      campaignId: params.campaignId,
      ...body
    });

    const { db } = await initializeFirebaseAdmin();

    // Use Firestore transaction for atomicity
    await db.runTransaction(async (transaction) => {
      // Check if affiliate link exists
      const affiliateLinksRef = db.collection('affiliateLinks');
      const existingLinkQuery = affiliateLinksRef
        .where('campaignId', '==', params.campaignId)
        .where('influencerId', '==', influencerId);
      
      const existingLinkSnapshot = await existingLinkQuery.get();

      if (existingLinkSnapshot.empty) {
        // Create new declined link
        const newLinkRef = affiliateLinksRef.doc();
        transaction.set(newLinkRef, {
          campaignId: params.campaignId,
          influencerId,
          businessId: '', // Will be filled from campaign data
          code: '',
          url: '',
          status: 'declined',
          payoutTerms: { type: 'percent', value: 0 },
          lifetimeEarnings: 0,
          pendingEarnings: 0,
          lastPayoutAt: null,
          lastPayoutId: null,
          createdAt: new Date()
        });
      } else {
        // Update existing link to declined
        const linkRef = existingLinkSnapshot.docs[0].ref;
        const existingData = existingLinkSnapshot.docs[0].data();
        
        if (existingData.status === 'declined') {
          throw new Error('Campaign already declined');
        }
        
        transaction.update(linkRef, {
          status: 'declined'
        });
      }
    });

    return NextResponse.json({ status: 'declined' });

  } catch (error: any) {
    console.error('Error declining campaign:', error);
    
    if (error.message === 'Campaign already declined') {
      return NextResponse.json({ error: 'Campaign already declined' }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to decline campaign' },
      { status: 500 }
    );
  }
}
