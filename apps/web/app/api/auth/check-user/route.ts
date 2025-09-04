import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const checkUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['business', 'influencer'])
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role } = checkUserSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check if user exists in the appropriate collection
    let userExists = false;
    let userId = null;

    if (role === 'business') {
      // Check businesses collection for email
      const businessesSnapshot = await adminDb!.collection('businesses')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!businessesSnapshot.empty) {
        userExists = true;
        userId = businessesSnapshot.docs[0].id;
      }
    } else if (role === 'influencer') {
      // Check influencers collection for email
      const influencersSnapshot = await adminDb!.collection('influencers')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!influencersSnapshot.empty) {
        userExists = true;
        userId = influencersSnapshot.docs[0].id;
      }
    }

    // Also check users collection as fallback
    if (!userExists) {
      const usersSnapshot = await adminDb!.collection('users')
        .where('email', '==', email)
        .where('role', '==', role)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        userExists = true;
        userId = usersSnapshot.docs[0].id;
      }
    }

    return NextResponse.json({
      exists: userExists,
      userId: userId,
      role: role
    });

  } catch (error) {
    console.error('Error checking user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
