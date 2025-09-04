import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const BusinessRegistrationSchema = z.object({
  businessId: z.string(),
  name: z.string().min(1),
  address: z.string().min(1),
  defaultSplitPct: z.number().min(1).max(100),
  posProvider: z.enum(['square', 'manual', 'clover', 'toast']),
  status: z.enum(['pending_approval', 'approved', 'rejected']).default('pending_approval'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  overview: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
    console.log('Received registration data:', body);
    const validatedData = BusinessRegistrationSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Create business registration request
    const businessRef = adminDb!.collection('business_registrations').doc(validatedData.businessId);
    
    await businessRef.set({
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null
    });

    // Also create a basic business record for immediate use (pending approval)
    const businessDoc = adminDb!.collection('businesses').doc(validatedData.businessId);
    await businessDoc.set({
      id: validatedData.businessId,
      name: validatedData.name,
      address: validatedData.address,
      defaultSplitPct: validatedData.defaultSplitPct,
      posProvider: validatedData.posProvider,
      status: 'pending_approval',
      createdAt: new Date(),
      coordinates: validatedData.coordinates || null,
      phone: validatedData.phone || null,
      email: validatedData.email || null,
      website: validatedData.website || null,
      overview: validatedData.overview || null
    });

    return NextResponse.json({
      success: true,
      message: 'Business registration submitted successfully',
      businessId: validatedData.businessId,
      status: 'pending_approval'
    });

  } catch (error) {
    console.error('Business registration error:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return NextResponse.json({
        error: 'Invalid registration data',
        details: error.errors,
        receivedData: body
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to register business',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
