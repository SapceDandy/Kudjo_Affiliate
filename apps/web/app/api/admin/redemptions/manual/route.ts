import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { z } from 'zod';

// Initialize Firebase Admin
function getAdminDb() {
  try {
    if (getApps().length === 0) {
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

const ManualRedemptionSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required'),
  businessId: z.string().min(1, 'Business ID is required'),
  influencerId: z.string().min(1, 'Influencer ID is required'),
  amountCents: z.number().min(1, 'Amount must be greater than 0'),
  description: z.string().optional(),
  redemptionDate: z.string().optional(), // ISO date string
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ManualRedemptionSchema.parse(body);
    
    const { 
      couponCode, 
      businessId, 
      influencerId, 
      amountCents, 
      description,
      redemptionDate,
      notes 
    } = parsed;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    // Verify business exists
    const businessDoc = await adminDb!.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    const businessData = businessDoc.data()!;

    // Verify influencer exists
    const influencerDoc = await adminDb!.collection('influencers').doc(influencerId).get();
    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }
    const influencerData = influencerDoc.data()!;

    // Check if coupon exists and get details
    let couponDoc = null;
    let couponData = null;
    let offerId = null;
    let splitPct = 20; // Default split

    try {
      const couponQuery = await adminDb!.collection('coupons')
        .where('code', '==', couponCode)
        .limit(1)
        .get();

      if (!couponQuery.empty) {
        couponDoc = couponQuery.docs[0];
        couponData = couponDoc.data();
        offerId = couponData.offerId;

        // Get offer details for split percentage
        if (offerId) {
          const offerDoc = await adminDb!.collection('offers').doc(offerId).get();
          if (offerDoc.exists) {
            const offerData = offerDoc.data()!;
            splitPct = offerData.splitPct || 20;
          }
        }
      }
    } catch (error) {
      console.warn('Could not find coupon, proceeding with manual entry:', error);
    }

    // Calculate earnings based on split percentage
    const earningsCents = Math.round(amountCents * (splitPct / 100));

    // Create redemption record
    const redemptionData = {
      couponCode,
      bizId: businessId,
      businessName: businessData.name || 'Unknown Business',
      infId: influencerId,
      influencerName: influencerData.name || influencerData.displayName || 'Unknown Influencer',
      offerId: offerId || null,
      amountCents,
      earningsCents,
      splitPct,
      description: description || 'Manual redemption entry',
      notes: notes || '',
      source: 'manual_admin',
      status: 'completed',
      redeemedAt: redemptionDate ? new Date(redemptionDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      admin: {
        enteredBy: 'admin', // Could be enhanced with actual admin user ID
        enteredAt: new Date(),
        verified: true
      }
    };

    // Add redemption
    const redemptionRef = await adminDb!.collection('redemptions').add(redemptionData);

    // Update coupon status if found
    if (couponDoc && couponData) {
      await couponDoc.ref.update({
        status: 'redeemed',
        redeemedAt: redemptionData.redeemedAt,
        updatedAt: new Date()
      });
    }

    // Update affiliate link if exists
    if (couponData?.linkId) {
      try {
        const linkDoc = await adminDb!.collection('affiliateLinks').doc(couponData.linkId).get();
        if (linkDoc.exists) {
          await linkDoc.ref.update({
            conversions: (linkDoc.data()?.conversions || 0) + 1,
            totalEarnings: (linkDoc.data()?.totalEarnings || 0) + earningsCents,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.warn('Could not update affiliate link:', error);
      }
    }

    // Update business metrics
    try {
      const metricsRef = adminDb!.collection('businessMetrics').doc(businessId);
      const metricsDoc = await metricsRef.get();
      
      if (metricsDoc.exists) {
        const currentMetrics = metricsDoc.data()!;
        await metricsRef.update({
          totalRedemptions: (currentMetrics.totalRedemptions || 0) + 1,
          totalPayoutOwed: (currentMetrics.totalPayoutOwed || 0) + earningsCents,
          updatedAt: new Date()
        });
      } else {
        await metricsRef.set({
          totalRedemptions: 1,
          totalPayoutOwed: earningsCents,
          activeOffers: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.warn('Could not update business metrics:', error);
    }

    // Update influencer metrics
    try {
      const infMetricsRef = adminDb!.collection('influencerMetrics').doc(influencerId);
      const infMetricsDoc = await infMetricsRef.get();
      
      if (infMetricsDoc.exists) {
        const currentMetrics = infMetricsDoc.data()!;
        await infMetricsRef.update({
          totalEarnings: (currentMetrics.totalEarnings || 0) + earningsCents,
          totalRedemptions: (currentMetrics.totalRedemptions || 0) + 1,
          updatedAt: new Date()
        });
      } else {
        await infMetricsRef.set({
          totalEarnings: earningsCents,
          totalRedemptions: 1,
          activeCampaigns: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.warn('Could not update influencer metrics:', error);
    }

    return NextResponse.json({
      success: true,
      redemptionId: redemptionRef.id,
      redemption: {
        id: redemptionRef.id,
        couponCode,
        businessName: businessData.name,
        influencerName: influencerData.name || influencerData.displayName,
        amountCents,
        earningsCents,
        splitPct,
        redeemedAt: redemptionData.redeemedAt,
        source: 'manual_admin'
      }
    });

  } catch (error: any) {
    console.error('Error creating manual redemption:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create manual redemption', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch recent manual redemptions for admin review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    // Get recent manual redemptions
    const redemptionsQuery = adminDb!.collection('redemptions')
      .where('source', '==', 'manual_admin')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const redemptionsSnapshot = await redemptionsQuery.get();
    
    const redemptions = redemptionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        couponCode: data.couponCode,
        businessName: data.businessName,
        influencerName: data.influencerName,
        amountCents: data.amountCents,
        earningsCents: data.earningsCents,
        splitPct: data.splitPct,
        description: data.description,
        notes: data.notes,
        redeemedAt: data.redeemedAt?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        admin: data.admin
      };
    });

    return NextResponse.json({
      redemptions,
      hasMore: redemptionsSnapshot.docs.length === limit,
      total: redemptions.length
    });

  } catch (error: any) {
    console.error('Error fetching manual redemptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual redemptions', details: error.message },
      { status: 500 }
    );
  }
}
