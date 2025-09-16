import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';
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
    const result = await db.runTransaction(async (transaction) => {
      // Get campaign details
      const campaignRef = db.collection('campaigns').doc(params.campaignId);
      const campaignDoc = await transaction.get(campaignRef);
      
      if (!campaignDoc.exists) {
        throw new Error('Campaign not found');
      }

      const campaignData = campaignDoc.data()!;
      
      if (campaignData.status !== 'active') {
        throw new Error('Campaign is not active');
      }

      // Check if affiliate link already exists
      const affiliateLinksRef = db.collection('affiliateLinks');
      const existingLinkQuery = affiliateLinksRef
        .where('campaignId', '==', params.campaignId)
        .where('influencerId', '==', influencerId);
      
      const existingLinkSnapshot = await existingLinkQuery.get();
      let affiliateLinkRef;
      let isNewLink = false;

      if (existingLinkSnapshot.empty) {
        // Create new affiliate link
        affiliateLinkRef = affiliateLinksRef.doc();
        isNewLink = true;
      } else {
        // Update existing link
        affiliateLinkRef = existingLinkSnapshot.docs[0].ref;
        const existingData = existingLinkSnapshot.docs[0].data();
        
        if (existingData.status === 'accepted' || existingData.status === 'active') {
          throw new Error('Campaign already accepted');
        }
      }

      // Generate unique tracking code with retry logic
      let code: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isUnique && attempts < maxAttempts) {
        code = `KJ-${nanoid(8).toUpperCase()}`;
        
        // Check if code is unique
        const codeCheckQuery = affiliateLinksRef.where('code', '==', code);
        const codeCheckSnapshot = await codeCheckQuery.get();
        
        if (codeCheckSnapshot.empty) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique code');
      }

      const trackingUrl = `https://kudjo.to/${code!}`;

      // Create/update affiliate link
      const affiliateLinkData = {
        campaignId: params.campaignId,
        influencerId,
        businessId: campaignData.businessId,
        code: code!,
        url: trackingUrl,
        status: 'accepted',
        payoutTerms: campaignData.payout,
        lifetimeEarnings: 0,
        pendingEarnings: 0,
        lastPayoutAt: null,
        lastPayoutId: null,
        createdAt: new Date()
      };

      if (isNewLink) {
        transaction.set(affiliateLinkRef, affiliateLinkData);
      } else {
        transaction.update(affiliateLinkRef, {
          ...affiliateLinkData,
          createdAt: existingLinkSnapshot.docs[0].data().createdAt // Preserve original creation date
        });
      }

      // Increment campaign participants count
      const currentMetrics = campaignData.metrics || {};
      transaction.update(campaignRef, {
        'metrics.participants': (currentMetrics.participants || 0) + (isNewLink ? 1 : 0),
        updatedAt: new Date()
      });

      return {
        linkId: affiliateLinkRef.id,
        code: code!,
        url: trackingUrl,
        status: 'accepted'
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error accepting campaign:', error);
    
    if (error.message === 'Campaign not found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    if (error.message === 'Campaign is not active') {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }
    
    if (error.message === 'Campaign already accepted') {
      return NextResponse.json({ error: 'Campaign already accepted' }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to accept campaign' },
      { status: 500 }
    );
  }
}
