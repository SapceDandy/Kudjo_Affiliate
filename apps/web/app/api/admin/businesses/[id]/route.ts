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

// Business update schema
const BusinessUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'pending', 'suspended']).optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  pricingTiers: z.array(
    z.object({
      id: z.string(),
      minFollowers: z.number().int().min(0),
      maxFollowers: z.number().int().nullable(),
      commission: z.number().min(0).max(100),
      flatFee: z.number().nullable(),
    })
  ).optional(),
  defaultCommission: z.number().min(0).max(100).optional(),
});

// Generate mock business data
function generateMockBusiness(id: string) {
  return {
    id,
    name: `Business ${id}`,
    email: `business${id}@example.com`,
    status: 'active',
    industry: 'Retail',
    address: '123 Main St, Anytown, USA',
    phone: '555-123-4567',
    website: 'https://example.com',
    description: 'A mock business for testing',
    createdAt: new Date().toISOString(),
    pricingTiers: [
      {
        id: '1',
        minFollowers: 0,
        maxFollowers: 10000,
        commission: 10,
        flatFee: null,
      },
      {
        id: '2',
        minFollowers: 10001,
        maxFollowers: 50000,
        commission: 15,
        flatFee: null,
      },
      {
        id: '3',
        minFollowers: 50001,
        maxFollowers: null,
        commission: 20,
        flatFee: null,
      },
    ],
    defaultCommission: 10,
    stats: {
      totalInfluencers: 12,
      totalCoupons: 34,
      activeCoupons: 15,
      totalRedemptions: 156,
      totalRevenue: 4500000, // cents
    }
  };
}

// GET handler for fetching a specific business
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const businessId = params.id;
  console.log(`Admin business API called for ID: ${businessId}`);

  try {
    // Get admin SDK
    const admin = await getAdmin();
    const db = admin.firestore();

    // Check if ID is in the format biz_XXX
    const actualId = businessId.startsWith('biz_') ? businessId.substring(4) : businessId;
    
    // Fetch business data
    const businessDoc = await db.collection('businesses').doc(actualId).get();
    
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessDoc.data() || {};
    
    // Fetch related data
    const [couponsSnap, redemptionsSnap] = await Promise.all([
      db.collection('coupons').where('bizId', '==', actualId).get(),
      db.collection('redemptions').where('bizId', '==', actualId).get(),
    ]);

    // Calculate stats
    const totalCoupons = couponsSnap.size;
    const activeCoupons = couponsSnap.docs.filter(d => d.get('status') === 'active').length;
    
    // Get unique influencers
    const influencerIds = new Set<string>();
    couponsSnap.docs.forEach(doc => {
      const infId = doc.get('infId');
      if (infId) influencerIds.add(infId);
    });
    
    // Calculate revenue
    let totalRevenue = 0;
    redemptionsSnap.docs.forEach(doc => {
      const amount = doc.get('amount');
      if (typeof amount === 'number' && !isNaN(amount)) {
        totalRevenue += Math.round(amount * 100);
      }
    });

    // Prepare response
    const business = {
      id: `biz_${actualId}`,
      name: businessData.name || `Business ${actualId}`,
      email: businessData.email || `business${actualId}@example.com`,
      status: businessData.status || 'active',
      industry: businessData.industry || 'Other',
      address: businessData.address || '',
      phone: businessData.phone || '',
      website: businessData.website || '',
      description: businessData.description || '',
      createdAt: businessData.createdAt || new Date().toISOString(),
      pricingTiers: businessData.pricingTiers || [],
      defaultCommission: businessData.defaultCommission || 10,
      stats: {
        totalInfluencers: influencerIds.size,
        totalCoupons,
        activeCoupons,
        totalRedemptions: redemptionsSnap.size,
        totalRevenue,
      }
    };

    return NextResponse.json(business);
  } catch (error) {
    console.error('Error fetching business data:', error);
    
    // Return mock data as fallback
    const mockBusiness = generateMockBusiness(businessId);
    return NextResponse.json({
      ...mockBusiness,
      isMockData: true
    });
  }
}

// PATCH handler for updating a specific business
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const businessId = params.id;
  console.log(`Admin business update API called for ID: ${businessId}`);

  try {
    const body = await request.json();
    const validatedData = BusinessUpdateSchema.parse(body);
    
    // Get admin SDK
    const admin = await getAdmin();
    const db = admin.firestore();

    // Check if ID is in the format biz_XXX
    const actualId = businessId.startsWith('biz_') ? businessId.substring(4) : businessId;
    
    // Fetch business to make sure it exists
    const businessDoc = await db.collection('businesses').doc(actualId).get();
    
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Update business data
    await db.collection('businesses').doc(actualId).update({
      ...validatedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Fetch updated business
    const updatedDoc = await db.collection('businesses').doc(actualId).get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      id: `biz_${actualId}`,
      ...updatedData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating business:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
} 