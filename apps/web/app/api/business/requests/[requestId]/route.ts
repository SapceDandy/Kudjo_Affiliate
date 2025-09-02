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
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;
    const body = await request.json();
    const { discountAmount, commissionSplit } = body;
    
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    if (typeof discountAmount !== 'number' || typeof commissionSplit !== 'number') {
      return NextResponse.json({ 
        error: 'discountAmount and commissionSplit must be numbers' 
      }, { status: 400 });
    }

    if (commissionSplit < 5 || commissionSplit > 50) {
      return NextResponse.json({ 
        error: 'Commission split must be between 5% and 50%' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Update the request with new offer terms
    const updateData = {
      discountAmount,
      commissionSplit,
      updatedAt: new Date()
    };

    await adminDb.collection('influencerRequests').doc(requestId).update(updateData);
    
    return NextResponse.json({ 
      success: true,
      message: 'Offer terms updated successfully'
    });

  } catch (error) {
    console.error('Error updating request offer terms:', error);
    return NextResponse.json(
      { error: 'Failed to update offer terms' },
      { status: 500 }
    );
  }
}
