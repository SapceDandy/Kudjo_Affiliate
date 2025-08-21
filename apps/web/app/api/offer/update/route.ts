import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

export const runtime = 'nodejs';

const OfferUpdateSchema = z.object({
  offerId: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  splitPct: z.number().min(1).max(100).optional(),
  minSpend: z.number().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  status: z.enum(['active', 'paused', 'ended']).optional(),
  maxInfluencers: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = OfferUpdateSchema.parse(body);
    const { offerId, ...updateData } = validatedData;

    // Check if offer exists
    const offerRef = doc(db, 'offers', offerId);
    const offerDoc = await getDoc(offerRef);
    
    if (!offerDoc.exists()) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Update the offer
    const updatedOffer = {
      ...updateData,
      active: updateData.status === 'active',
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(offerRef, updatedOffer);

    return NextResponse.json({
      success: true,
      offerId,
      updatedFields: updateData,
    });

  } catch (error) {
    console.error('Offer update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    );
  }
} 