import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const BulkApproveSchema = z.object({
  influencerIds: z.array(z.string().min(1)).min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { influencerIds } = BulkApproveSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const batch = adminDb!.batch();
    const now = new Date();

    // Update each influencer
    for (const influencerId of influencerIds) {
      const influencerRef = adminDb!.collection('influencers').doc(influencerId);
      
      batch.update(influencerRef, {
        status: 'approved',
        reviewedAt: now,
        reviewedBy: 'admin',
        updatedAt: now
      });

      // Log the approval
      const reviewLogRef = adminDb!.collection('influencerReviews').doc();
      batch.set(reviewLogRef, {
        influencerId,
        action: 'approve',
        reviewedBy: 'admin',
        reviewedAt: now,
        createdAt: now
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully approved ${influencerIds.length} influencers`,
      processedCount: influencerIds.length
    });

  } catch (error) {
    console.error('Bulk approve error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to bulk approve influencers'
    }, { status: 500 });
  }
}
