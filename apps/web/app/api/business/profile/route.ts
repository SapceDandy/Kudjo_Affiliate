import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { z } from 'zod';

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

const profileSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  overview: z.string().optional(),
  defaultSplitPct: z.number().min(5).max(50),
  posProvider: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  category: z.string().optional(),
  hours: z.string().optional()
});

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

    const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
    
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessData = businessDoc.data()!;
    
    return NextResponse.json({
      name: businessData.name || '',
      address: businessData.address || '',
      website: businessData.website || '',
      overview: businessData.overview || '',
      defaultSplitPct: businessData.defaultSplitPct || 20,
      posProvider: businessData.posProvider || 'manual',
      phone: businessData.phone || '',
      email: businessData.email || '',
      category: businessData.category || '',
      hours: businessData.hours || ''
    });

  } catch (error) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = profileSchema.parse(body);

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    const businessRef = adminDb.collection('businesses').doc(validatedData.businessId);
    
    // Check if business exists
    const businessDoc = await businessRef.get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Update business profile
    const updateData = {
      name: validatedData.name,
      address: validatedData.address || '',
      website: validatedData.website || '',
      overview: validatedData.overview || '',
      defaultSplitPct: validatedData.defaultSplitPct,
      posProvider: validatedData.posProvider,
      phone: validatedData.phone || '',
      email: validatedData.email || '',
      category: validatedData.category || '',
      hours: validatedData.hours || '',
      updatedAt: new Date()
    };

    await businessRef.update(updateData);

    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully' 
    });

  } catch (error) {
    console.error('Error updating business profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
