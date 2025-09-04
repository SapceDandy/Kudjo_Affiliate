import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const { offerId } = params;
    const body = await request.json();
    const { status } = body;
    
    if (!offerId) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }

    if (!status || !['active', 'paused', 'ended'].includes(status)) {
      return NextResponse.json({ 
        error: 'Status must be one of: active, paused, ended' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Update the offer status
    const updateData = {
      status,
      updatedAt: new Date()
    };

    await adminDb!.collection('offers').doc(offerId).update(updateData);
    
    return NextResponse.json({ 
      success: true,
      message: `Offer ${status} successfully`
    });

  } catch (error) {
    console.error('Error updating offer status:', error);
    return NextResponse.json(
      { error: 'Failed to update offer status' },
      { status: 500 }
    );
  }
}
