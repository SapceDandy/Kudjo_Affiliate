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

const ApiCouponPosFlag = z.object({
  couponId: z.string(),
  posAdded: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = ApiCouponPosFlag.parse(body);
    const { couponId, posAdded } = validatedData;

    // Get admin SDK
    const admin = await getAdmin();
    const db = admin.firestore();

    // Check if coupon exists
    const couponRef = db.collection('coupons').doc(couponId);
    const couponDoc = await couponRef.get();

    if (!couponDoc.exists) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Update the admin.posAdded field
    const updateData: any = {
      'admin.posAdded': posAdded,
    };

    // Add timestamp if setting to true
    if (posAdded) {
      updateData['admin.posAddedAt'] = new Date().toISOString();
    }

    await couponRef.update(updateData);

    return NextResponse.json({
      success: true,
      couponId,
      posAdded,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('POS flag update error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 