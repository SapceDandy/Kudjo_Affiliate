import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

// Initialize Firebase Admin
function getAdminDb() {
  try {
    if (getApps().length === 0) {
      // Try environment variables first
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      
      if (privateKey && clientEmail && projectId) {
        const app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
        return getFirestore(app);
      }
    }
    
    return getFirestore();
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get business ID from query params for now (in production, use session)
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured. Please check your environment variables.' 
      }, { status: 500 });
    }

    // Query business's offers
    const offersRef = adminDb.collection('offers');
    const offersQuery = offersRef.where('bizId', '==', businessId);
    const offersSnapshot = await offersQuery.get();
    
    const activeOffers = offersSnapshot.docs.filter((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return data.active === true;
    }).length;

    // Query redemptions for this business
    const redemptionsRef = adminDb.collection('redemptions');
    const redemptionsQuery = redemptionsRef.where('bizId', '==', businessId);
    const redemptionsSnapshot = await redemptionsQuery.get();

    let totalPayoutOwed = 0;
    let totalRevenue = 0;
    const influencerStats: Record<string, { redemptions: number; payout: number; name?: string }> = {};

    redemptionsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      const infEarnings = data.infEarnings || 0;
      const orderValue = data.orderValueCents || 0;
      const infId = data.infId;

      totalPayoutOwed += infEarnings;
      totalRevenue += orderValue;

      if (infId) {
        if (!influencerStats[infId]) {
          influencerStats[infId] = { redemptions: 0, payout: 0 };
        }
        influencerStats[infId].redemptions += 1;
        influencerStats[infId].payout += infEarnings;
      }
    });

    const totalRedemptions = redemptionsSnapshot.size;
    const avgOrderValue = totalRedemptions > 0 ? Math.round(totalRevenue / totalRedemptions) : 0;

    // Query influencer requests for this business
    const requestsRef = adminDb.collection('influencerRequests');
    const requestsQuery = requestsRef.where('bizId', '==', businessId);
    const requestsSnapshot = await requestsQuery.get();
    const pendingRequests = requestsSnapshot.size;

    // Get top influencers (limit to top 5) with actual names
    const topInfluencersData = await Promise.all(
      Object.entries(influencerStats)
        .sort(([,a], [,b]) => b.redemptions - a.redemptions)
        .slice(0, 5)
        .map(async ([infId, stats]) => {
          try {
            const influencerDoc = await adminDb.collection('influencers').doc(infId).get();
            const influencerData = influencerDoc.data();
            return {
              name: influencerData?.handle || `Influencer ${infId.slice(-4)}`,
              redemptions: stats.redemptions,
              payout: stats.payout
            };
          } catch {
            return {
              name: `Influencer ${infId.slice(-4)}`,
              redemptions: stats.redemptions,
              payout: stats.payout
            };
          }
        })
    );

    return NextResponse.json({
      totalPayoutOwed,
      totalRedemptions,
      activeOffers,
      pendingRequests,
      totalRevenue,
      avgOrderValue,
      topInfluencers: topInfluencersData
    });

  } catch (error: any) {
    console.error('Error fetching business metrics:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}
