import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }

    const businessDoc = await adminDb!.collection('businesses').doc(businessId).get();
    
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();
    const tierSettings = businessData?.tierSettings || {
      tiers: [],
      defaultCommission: 10
    };

    return NextResponse.json(tierSettings);
  } catch (error) {
    console.error('Error fetching tier settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, tiers, defaultCommission } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }

    const tierSettings = {
      tiers: tiers || [],
      defaultCommission: defaultCommission || 10,
      updatedAt: new Date()
    };

    await adminDb!.collection('businesses').doc(businessId).update({
      tierSettings,
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      tierSettings 
    });
  } catch (error) {
    console.error('Error updating tier settings:', error);
    return NextResponse.json(
      { error: 'Failed to update tier settings' },
      { status: 500 }
    );
  }
}
