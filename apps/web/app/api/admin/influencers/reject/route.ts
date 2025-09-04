import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const RejectInfluencerSchema = z.object({
  influencerId: z.string().min(1),
  reason: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { influencerId, reason } = RejectInfluencerSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const influencerRef = adminDb!.collection('influencers').doc(influencerId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    const now = new Date();
    
    // Update influencer status to rejected
    await influencerRef.update({
      status: 'rejected',
      reviewedAt: now,
      reviewedBy: 'admin',
      rejectionReason: reason,
      updatedAt: now
    });

    // Log the rejection
    await adminDb!.collection('influencerReviews').add({
      influencerId,
      action: 'reject',
      reason,
      reviewedBy: 'admin',
      reviewedAt: now,
      createdAt: now
    });

    return NextResponse.json({
      success: true,
      message: 'Influencer rejected',
      influencerId
    });

  } catch (error) {
    console.error('Reject influencer error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to reject influencer'
    }, { status: 500 });
  }
}
