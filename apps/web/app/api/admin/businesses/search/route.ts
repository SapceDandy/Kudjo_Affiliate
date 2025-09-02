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
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    // Search businesses by name (simple approach for MVP)
    const businessesRef = adminDb.collection('businesses');
    const snapshot = await businessesRef.limit(50).get(); // Get more to filter client-side

    const allBusinesses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown Business',
        address: data.address,
        email: data.email,
        phone: data.phone,
        website: data.website,
        createdAt: data.createdAt?.toDate?.() || new Date()
      };
    });

    // Filter by query (case-insensitive)
    const searchTerm = query.toLowerCase();
    const filteredBusinesses = allBusinesses
      .filter(business => 
        business.name.toLowerCase().includes(searchTerm) ||
        business.address?.toLowerCase().includes(searchTerm) ||
        business.email?.toLowerCase().includes(searchTerm)
      )
      .slice(0, limit);

    return NextResponse.json({
      businesses: filteredBusinesses,
      total: filteredBusinesses.length
    });

  } catch (error: any) {
    console.error('Error searching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to search businesses', details: error.message },
      { status: 500 }
    );
  }
}
