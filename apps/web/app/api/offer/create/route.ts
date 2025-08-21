import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    // TODO: Add proper authentication check for business users
    // For now, we'll accept the request but should verify user is a business owner

    const body = await request.json();
    const validatedData = OfferCreateSchema.parse(body);

    // Generate offer ID
    const offerId = makeDocumentId();
    const now = new Date().toISOString();

    // Create offer document
    const offer = {
      ...validatedData,
      id: offerId,
      bizId: 'temp-business-id', // TODO: Get from authenticated user
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