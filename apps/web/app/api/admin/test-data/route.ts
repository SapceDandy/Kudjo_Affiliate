import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { db } = await initializeFirebaseAdmin();
    
    const timestamp = new Date().toISOString();

    // Add pending business
    const pendingBusiness = {
      businessName: 'Fresh Eats Cafe',
      email: 'owner@fresheats.com',
      phone: '+1-555-0123',
      website: 'https://fresheats.com',
      category: 'Food & Beverage',
      description: 'Local organic cafe specializing in fresh, healthy meals and artisanal coffee.',
      approvalStatus: 'pending',
      approved: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102'
      }
    };

    // Add pending influencer
    const pendingInfluencer = {
      name: 'Sarah Johnson',
      email: 'sarah@foodiegram.com',
      phone: '+1-555-0789',
      tier: 'M',
      followers: 45000,
      category: 'Food & Lifestyle',
      description: 'Food blogger and lifestyle influencer sharing healthy recipes and restaurant reviews.',
      approvalStatus: 'pending',
      approved: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      socialMedia: {
        instagram: '@sarahfoodie',
        tiktok: '@sarahcooks'
      }
    };

    // Add business
    await db.collection('businesses').doc('test_pending_business').set(pendingBusiness);
    
    // Add influencer
    await db.collection('influencers').doc('test_pending_influencer').set(pendingInfluencer);

    return NextResponse.json({
      success: true,
      message: 'Added 2 pending users for testing',
      data: {
        business: 'test_pending_business',
        influencer: 'test_pending_influencer'
      }
    });

  } catch (error) {
    console.error('Error adding test data:', error);
    
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to add test data' } },
      { status: 500 }
    );
  }
}
