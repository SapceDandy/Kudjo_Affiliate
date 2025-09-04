import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const ApproveInfluencerSchema = z.object({
  influencerId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { influencerId } = ApproveInfluencerSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const influencerRef = adminDb!.collection('influencers').doc(influencerId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    const now = new Date();
    
    // Update influencer status to approved
    await influencerRef.update({
      status: 'approved',
      reviewedAt: now,
      reviewedBy: 'admin',
      updatedAt: now
    });

    // Log the approval
    await adminDb!.collection('influencerReviews').add({
      influencerId,
      action: 'approve',
      reviewedBy: 'admin',
      reviewedAt: now,
      createdAt: now
    });

    return NextResponse.json({
      success: true,
      message: 'Influencer approved successfully',
      influencerId
    });

  } catch (error) {
    console.error('Approve influencer error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to approve influencer'
    }, { status: 500 });
  }
}
