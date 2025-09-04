import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const ConnectPosSchema = z.object({
  provider: z.enum(['square', 'manual', 'clover']),
  businessId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  merchantId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ConnectPosSchema.parse(body);

    // Verify business exists or create demo business
    let businessDoc = await adminDb!
      .collection('businesses')
      .doc(validatedData.businessId)
      .get();

    if (!businessDoc.exists) {
      // Create demo business for onboarding flow
      await adminDb!.collection('businesses').doc(validatedData.businessId).set({
        id: validatedData.businessId,
        name: 'Demo Business',
        status: 'pending_approval',
        createdAt: new Date(),
        posProvider: null,
        posStatus: 'not_connected'
      });
      businessDoc = await adminDb!.collection('businesses').doc(validatedData.businessId).get();
    }

    const businessId = validatedData.businessId;

    // Update business with POS connection info
    const updateData: any = {
      posProvider: validatedData.provider,
      posStatus: 'connected',
      updatedAt: new Date().toISOString(),
    };

    // Add provider-specific data
    if (validatedData.provider === 'square') {
      updateData.squareAccessToken = validatedData.accessToken;
      updateData.squareRefreshToken = validatedData.refreshToken;
      updateData.squareMerchantId = validatedData.merchantId;
    } else if (validatedData.provider === 'manual') {
      updateData.manualModeEnabled = true;
    }

    await adminDb!.collection('businesses').doc(businessId).update(updateData);

    return NextResponse.json({
      success: true,
      message: `${validatedData.provider} POS connection successful`,
      businessId,
    });

  } catch (error) {
    console.error('POS connect error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
