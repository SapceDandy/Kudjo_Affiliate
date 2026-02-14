import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const testInfluencer = {
      id: 'testhandleinfluencer',
      handle: '@testhandleinfluencer',
      displayName: 'Test Handle Influencer',
      name: 'Test Handle Influencer',
      email: 'testhandleinfluencer@example.com',
      followers: 15000,
      avgViews: 8500,
      tier: 'Gold',
      platforms: ['instagram', 'tiktok'],
      platform: 'instagram',
      location: 'Los Angeles, CA',
      bio: 'Test influencer account for QA testing purposes',
      profileImage: 'https://via.placeholder.com/150',
      verified: true,
      status: 'approved',
      approved: true,
      hasVerifiedSocial: true,
      socialMedia: {
        instagram: {
          handle: 'testhandleinfluencer',
          followers: 15000,
          verified: true,
          connected: true
        },
        tiktok: {
          handle: 'testhandleinfluencer',
          followers: 12000,
          verified: false,
          connected: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to influencers collection with specific document ID
    await adminDb.collection('influencers').doc('testhandleinfluencer').set(testInfluencer);
    
    // Verify it was added
    const doc = await adminDb.collection('influencers').doc('testhandleinfluencer').get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Failed to verify influencer creation' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test influencer @testhandleinfluencer added successfully',
      data: doc.data()
    });

  } catch (error: any) {
    console.error('Error adding test influencer:', error);
    return NextResponse.json(
      { error: 'Failed to add test influencer', details: error.message },
      { status: 500 }
    );
  }
}
