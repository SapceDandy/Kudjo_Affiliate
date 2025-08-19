import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy admin init to avoid duplicate app errors
let adminAppInitialized = false;

function tryLoadServiceAccount(): any | null {
  const candidates = [
    path.resolve(process.cwd(), '../../scripts/firebase-service-account.json'),
    path.resolve(process.cwd(), 'scripts/firebase-service-account.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const svc = JSON.parse(raw);
        svc.private_key = (svc.private_key || '').replace(/\\n/g, '\n');
        return svc;
      }
    } catch (err) {
      console.error(`Error loading service account from ${p}:`, err);
    }
  }
  return null;
}

async function getAdmin() {
  const admin = await import('firebase-admin');

  if (!adminAppInitialized) {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        if (admin.apps.length === 0) {
          admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
        }
      } else {
        const svc = tryLoadServiceAccount();
        if (!svc) {
          throw new Error('Missing Firebase Admin credentials. Set FIREBASE_* envs or add scripts/firebase-service-account.json');
        }
        if (admin.apps.length === 0) {
          admin.initializeApp({ credential: admin.credential.cert(svc) });
        }
      }
      adminAppInitialized = true;
    } catch (err) {
      console.error('Failed to initialize admin app:', err);
      throw err;
    }
  }
  return admin;
}

// Coupon update schema
const CouponUpdateSchema = z.object({
  status: z.enum(['active', 'expired', 'redeemed']).optional(),
  redemptions: z.number().int().min(0).optional(),
  revenue: z.number().min(0).optional(), // in cents
  expiresAt: z.string().datetime().optional(),
  cap_cents: z.number().int().min(0).optional(),
});

// Generate mock coupon data
function generateMockCoupon(id: string) {
  return {
    id,
    code: `CODE${Math.floor(1000 + Math.random() * 9000)}`,
    type: Math.random() > 0.5 ? 'AFFILIATE' : 'CONTENT_MEAL',
    status: ['active', 'expired', 'redeemed'][Math.floor(Math.random() * 3)],
    bizId: `biz_${Math.floor(Math.random() * 100)}`,
    infId: `inf_${Math.floor(Math.random() * 100)}`,
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    expiresAt: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 10000000000).toISOString() : null,
    cap_cents: Math.floor(5000 + Math.random() * 10000),
    redemptions: Math.floor(Math.random() * 50),
    revenue: Math.floor(Math.random() * 5000) * 100, // in cents
    business: {
      name: `Business ${Math.floor(Math.random() * 100)}`
    },
    influencer: {
      handle: `@influencer${Math.floor(Math.random() * 100)}`
    }
  };
}

// GET handler for fetching a specific coupon
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const couponId = params.id;
  console.log(`Admin coupon API called for ID: ${couponId}`);

  try {
    // Get admin SDK
    const admin = await getAdmin();
    const db = admin.firestore();
    
    // Fetch coupon data
    const couponDoc = await db.collection('coupons').doc(couponId).get();
    
    if (!couponDoc.exists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const couponData = couponDoc.data() || {};
    
    // Fetch related data (business and influencer)
    const [businessDoc, influencerDoc, redemptionsSnap] = await Promise.all([
      couponData.bizId ? db.collection('businesses').doc(couponData.bizId).get() : Promise.resolve({ exists: false }),
      couponData.infId ? db.collection('influencers').doc(couponData.infId).get() : Promise.resolve({ exists: false }),
      db.collection('redemptions').where('couponId', '==', couponId).get(),
    ]);

    // Calculate revenue
    let totalRevenue = 0;
    redemptionsSnap.docs.forEach(doc => {
      const amount = doc.get('amount');
      if (typeof amount === 'number' && !isNaN(amount)) {
        totalRevenue += Math.round(amount * 100);
      }
    });

    // Prepare response
    const coupon = {
      id: couponId,
      code: couponData.code || `CODE${couponId}`,
      type: couponData.type || 'AFFILIATE',
      status: couponData.status || 'active',
      bizId: couponData.bizId || '',
      infId: couponData.infId || '',
      createdAt: couponData.createdAt || new Date().toISOString(),
      expiresAt: couponData.expiresAt || null,
      cap_cents: couponData.cap_cents || 0,
      redemptions: redemptionsSnap.size,
      revenue: totalRevenue,
      business: businessDoc.exists && 'data' in businessDoc ? {
        id: couponData.bizId,
        name: businessDoc.data()?.name || `Business ${couponData.bizId}`,
      } : null,
      influencer: influencerDoc.exists && 'data' in influencerDoc ? {
        id: couponData.infId,
        handle: influencerDoc.data()?.handle || `@influencer${couponData.infId}`,
      } : null,
    };

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Error fetching coupon data:', error);
    
    // Return mock data as fallback
    const mockCoupon = generateMockCoupon(couponId);
    return NextResponse.json({
      ...mockCoupon,
      isMockData: true
    });
  }
}

// PATCH handler for updating a specific coupon
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const couponId = params.id;
  console.log(`Admin coupon update API called for ID: ${couponId}`);

  try {
    const body = await request.json();
    const validatedData = CouponUpdateSchema.parse(body);
    
    // Get admin SDK
    const admin = await getAdmin();
    const db = admin.firestore();
    
    // Fetch coupon to make sure it exists
    const couponDoc = await db.collection('coupons').doc(couponId).get();
    
    if (!couponDoc.exists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Update coupon data
    await db.collection('coupons').doc(couponId).update({
      ...validatedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If redemptions or revenue are updated, we need to update or create redemption records
    if (validatedData.redemptions !== undefined || validatedData.revenue !== undefined) {
      const couponData = couponDoc.data() || {};
      
      // Get existing redemptions
      const redemptionsSnap = await db.collection('redemptions')
        .where('couponId', '==', couponId)
        .get();
      
      const existingRedemptions = redemptionsSnap.size;
      const requestedRedemptions = validatedData.redemptions || 0;
      
      // If we need to add more redemptions
      if (requestedRedemptions > existingRedemptions) {
        const redemptionsToAdd = requestedRedemptions - existingRedemptions;
        const revenuePerRedemption = validatedData.revenue 
          ? Math.floor(validatedData.revenue / requestedRedemptions) 
          : Math.floor(1000 + Math.random() * 2000);
        
        // Create batch for adding redemptions
        const batch = db.batch();
        
        for (let i = 0; i < redemptionsToAdd; i++) {
          const newRedemptionRef = db.collection('redemptions').doc();
          batch.set(newRedemptionRef, {
            couponId,
            bizId: couponData.bizId,
            infId: couponData.infId,
            amount: revenuePerRedemption / 100, // Convert cents to dollars
            createdAt: new Date().toISOString(),
          });
        }
        
        await batch.commit();
      }
      // If we need to remove redemptions, we'd handle that here
      // But for simplicity, we'll just leave existing redemptions
    }

    // Fetch updated coupon
    const updatedDoc = await db.collection('coupons').doc(couponId).get();
    const updatedData = updatedDoc.data() || {};

    // Fetch updated redemptions
    const updatedRedemptionsSnap = await db.collection('redemptions')
      .where('couponId', '==', couponId)
      .get();
    
    // Calculate updated revenue
    let updatedRevenue = 0;
    updatedRedemptionsSnap.docs.forEach(doc => {
      const amount = doc.get('amount');
      if (typeof amount === 'number' && !isNaN(amount)) {
        updatedRevenue += Math.round(amount * 100);
      }
    });

    return NextResponse.json({
      id: couponId,
      ...updatedData,
      redemptions: updatedRedemptionsSnap.size,
      revenue: updatedRevenue,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
} 