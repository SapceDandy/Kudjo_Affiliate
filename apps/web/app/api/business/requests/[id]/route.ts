import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, ...updateData } = body;

    console.log(`PATCH /api/business/requests/${id} - Request body:`, body);

    if (!adminDb) {
      console.log('Firebase not configured, adminDb is null');
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Update the request document
    const requestRef = adminDb.collection('influencerRequests').doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const updatePayload = {
      ...updateData,
      status,
      updatedAt: new Date()
    };

    await requestRef.update(updatePayload);
    console.log(`Request ${id} updated with status: ${status}`);

    return NextResponse.json({ 
      success: true, 
      message: `Request ${status} successfully` 
    });

  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
