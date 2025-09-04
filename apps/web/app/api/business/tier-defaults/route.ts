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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    // Get business tier defaults
    const businessDoc = await adminDb!.collection('businesses').doc(businessId).get();
    
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessDoc.data();
    const tierDefaults = businessData?.tierDefaults || {
      Bronze: { defaultSplit: 15, name: 'Bronze', followers: '1K-5K' },
      Silver: { defaultSplit: 20, name: 'Silver', followers: '5K-20K' },
      Gold: { defaultSplit: 25, name: 'Gold', followers: '20K-50K' },
      Platinum: { defaultSplit: 30, name: 'Platinum', followers: '50K+' }
    };

    return NextResponse.json({ tierDefaults });

  } catch (error: any) {
    console.error('Error fetching tier defaults:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier defaults', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { tierDefaults } = body;

    if (!tierDefaults) {
      return NextResponse.json({ error: 'tierDefaults required' }, { status: 400 });
    }

    // Validate tier defaults structure
    const validTiers = ['S', 'M', 'L', 'XL', 'Huge'];
    for (const tier of validTiers) {
      if (!tierDefaults[tier] || typeof tierDefaults[tier].defaultSplit !== 'number') {
        return NextResponse.json({ 
          error: `Invalid tier defaults for tier ${tier}` 
        }, { status: 400 });
      }
      
      const split = tierDefaults[tier].defaultSplit;
      if (split < 5 || split > 50) {
        return NextResponse.json({ 
          error: `Default split for tier ${tier} must be between 5% and 50%` 
        }, { status: 400 });
      }
    }

    // Update business tier defaults
    await adminDb!.collection('businesses').doc(businessId).update({
      tierDefaults,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tier defaults updated successfully',
      tierDefaults 
    });

  } catch (error: any) {
    console.error('Error updating tier defaults:', error);
    return NextResponse.json(
      { error: 'Failed to update tier defaults', details: error.message },
      { status: 500 }
    );
  }
}
