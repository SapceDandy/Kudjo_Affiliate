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

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json();
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Update business approval status
    await adminDb.collection('businesses').doc(businessId).update({
      approved: true,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Business approved successfully' 
    });

  } catch (error) {
    console.error('Error approving business:', error);
    return NextResponse.json(
      { error: 'Failed to approve business' },
      { status: 500 }
    );
  }
}
