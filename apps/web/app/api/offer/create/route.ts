import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from '@/lib/auth-server';
import { z } from 'zod';

export const runtime = 'nodejs';

const OfferCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  splitPct: z.number().min(1).max(100),
  minSpend: z.number().optional(),
  startAt: z.string(),
  endAt: z.string().optional(),
  maxInfluencers: z.number().optional(),
});

function makeDocumentId(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and is a business or admin
    const { user } = await getAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'business' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only business owners or admins can create offers' },
        { status: 403 }
      );
    }

    // Look up business profile for the authenticated user
    let bizId: string;
    if (user.role === 'admin') {
      // Admin can pass bizId in body
      const bodyRaw = await request.clone().json();
      bizId = bodyRaw.bizId;
      if (!bizId) {
        return NextResponse.json(
          { error: 'bizId is required for admin offer creation' },
          { status: 400 }
        );
      }
    } else {
      // Business user — find their business profile
      const businessQuery = query(
        collection(db, 'businesses'),
        where('ownerUid', '==', user.uid)
      );
      const businessSnapshot = await getDocs(businessQuery);
      if (businessSnapshot.empty) {
        return NextResponse.json(
          { error: 'No business profile found for this user' },
          { status: 404 }
        );
      }
      bizId = businessSnapshot.docs[0].id;
    }

    const body = await request.json();
    const validatedData = OfferCreateSchema.parse(body);

    // Generate offer ID
    const offerId = makeDocumentId();
    const now = new Date().toISOString();

    // Create offer document
    const offer = {
      ...validatedData,
      id: offerId,
      bizId,
      status: 'active',
      active: true,
      currentInfluencers: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    await setDoc(doc(db, 'offers', offerId), offer);

    return NextResponse.json({
      success: true,
      offerId,
      offer,
    }, { status: 201 });

  } catch (error) {
    console.error('Offer creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    );
  }
}
