import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';

const GetCampaignsSchema = z.object({
  influencerId: z.string(),
  tab: z.enum(['invited', 'open']).default('invited')
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const influencerId = searchParams.get('influencerId');
    const tab = searchParams.get('tab') || 'invited';
    
    if (!influencerId) {
      return NextResponse.json({ error: 'influencerId required' }, { status: 400 });
    }

    const { db } = await initializeFirebaseAdmin();

    if (tab === 'invited') {
      // Get campaigns where influencer has pending/accepted affiliate links
      const affiliateLinksRef = db.collection('affiliateLinks');
      const linksQuery = affiliateLinksRef.where('influencerId', '==', influencerId);
      const linksSnapshot = await linksQuery.get();

      const campaignIds = new Set<string>();
      const linksByCampaign = new Map<string, any>();

      linksSnapshot.forEach((doc) => {
        const linkData = doc.data();
        campaignIds.add(linkData.campaignId);
        linksByCampaign.set(linkData.campaignId, {
          id: doc.id,
          ...linkData,
          createdAt: linkData.createdAt?.toDate?.() || new Date(linkData.createdAt)
        });
      });

      if (campaignIds.size === 0) {
        return NextResponse.json([]);
      }

      // Get campaign details for invited campaigns
      const campaignsRef = db.collection('campaigns');
      const campaigns = [];
      
      for (const campaignId of campaignIds) {
        const campaignDoc = await campaignsRef.doc(campaignId).get();
        if (campaignDoc.exists) {
          const campaignData = campaignDoc.data();
          if (!campaignData) continue;
          
          const affiliateLink = linksByCampaign.get(campaignId);
          
          // Get business details
          const businessDoc = await db.collection('businesses').doc(campaignData.businessId).get();
          const businessData = businessDoc.exists ? businessDoc.data() : null;

          // Get coupon template details
          const couponDoc = await db.collection('coupons').doc(campaignData.couponTemplateId).get();
          const couponData = couponDoc.exists ? couponDoc.data() : null;

          campaigns.push({
            id: campaignDoc.id,
            offerId: campaignData.couponTemplateId,
            businessName: businessData?.name || 'Unknown Business',
            offerTitle: campaignData.name,
            splitPct: campaignData.payout?.type === 'percent' ? campaignData.payout.value : 0,
            status: affiliateLink.status === 'accepted' || affiliateLink.status === 'active' ? 'active' : 
                   affiliateLink.status === 'declined' ? 'declined' : 'pending',
            affiliateLink: affiliateLink.status === 'accepted' || affiliateLink.status === 'active' ? {
              url: affiliateLink.url,
              qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(affiliateLink.url)}`
            } : undefined,
            contentCoupon: couponData ? {
              code: affiliateLink.code,
              qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(affiliateLink.code)}`,
              used: false // TODO: Track usage
            } : undefined,
            earnings: affiliateLink.lifetimeEarnings || 0,
            createdAt: (campaignData.createdAt?.toDate?.() || new Date(campaignData.createdAt)).toISOString(),
            deadline: campaignData.endAt ? (campaignData.endAt?.toDate?.() || new Date(campaignData.endAt)).toISOString() : undefined,
            campaignId: campaignDoc.id,
            linkId: affiliateLink.id,
            linkStatus: affiliateLink.status
          });
        }
      }

      return NextResponse.json(campaigns);

    } else {
      // Get public campaigns that influencer is eligible for
      const campaignsRef = db.collection('campaigns');
      const publicCampaignsQuery = campaignsRef
        .where('visibility', '==', 'public')
        .where('status', '==', 'active');
      
      const campaignsSnapshot = await publicCampaignsQuery.get();
      const campaigns = [];

      for (const doc of campaignsSnapshot.docs) {
        const campaignData = doc.data();
        
        // Check if influencer already has a link for this campaign
        const existingLinkQuery = db.collection('affiliateLinks')
          .where('campaignId', '==', doc.id)
          .where('influencerId', '==', influencerId);
        const existingLinkSnapshot = await existingLinkQuery.get();
        
        // Skip if already has a link
        if (!existingLinkSnapshot.empty) {
          continue;
        }

        // Get business details
        const businessDoc = await db.collection('businesses').doc(campaignData.businessId).get();
        const businessData = businessDoc.exists ? businessDoc.data() : null;

        campaigns.push({
          id: doc.id,
          offerId: campaignData.couponTemplateId,
          businessName: businessData?.name || 'Unknown Business',
          offerTitle: campaignData.name,
          splitPct: campaignData.payout.type === 'percent' ? campaignData.payout.value : 0,
          status: 'available',
          earnings: 0,
          createdAt: (campaignData.createdAt?.toDate?.() || new Date(campaignData.createdAt)).toISOString(),
          deadline: campaignData.endAt ? (campaignData.endAt?.toDate?.() || new Date(campaignData.endAt)).toISOString() : undefined,
          campaignId: doc.id,
          description: campaignData.description,
          eligibilityTags: campaignData.eligibilityTags || []
        });
      }

      return NextResponse.json(campaigns);
    }

  } catch (error: any) {
    console.error('Error fetching influencer campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
