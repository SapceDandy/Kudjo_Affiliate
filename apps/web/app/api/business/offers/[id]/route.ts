import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, ...updateData } = body;

    console.log(`PATCH /api/business/offers/${id} - Request body:`, body);

    if (!adminDb) {
      console.log('Firebase not configured, adminDb is null');
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Update the offer document
    const offerRef = adminDb.collection('offers').doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const updatePayload = {
      ...updateData,
      status,
      active: status === 'active',
      updatedAt: new Date()
    };

    await offerRef.update(updatePayload);
    console.log(`Offer ${id} updated with status: ${status}`);

    return NextResponse.json({ 
      success: true, 
      message: `Offer ${status} successfully` 
    });

  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { error: 'Failed to update offer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
