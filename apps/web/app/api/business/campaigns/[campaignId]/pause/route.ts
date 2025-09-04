import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const requestSchema = z.object({
  reason: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const authResult = await requireRole('business', 'admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { campaignId } = params;
    const body = await request.json();
    const { reason } = requestSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get the campaign
    const campaignRef = adminDb!.collection('offers').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (!campaignDoc.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaignDoc.data()!;

    // Check if already paused
    if (campaign.status === 'paused') {
      return NextResponse.json({ error: 'Campaign is already paused' }, { status: 400 });
    }

    // Update campaign status
    await campaignRef.update({
      status: 'paused',
      pausedAt: new Date(),
      pauseReason: reason || 'Manual pause',
      updatedAt: new Date()
    });

    // Log the action
    await adminDb!.collection('campaignLogs').add({
      campaignId,
      action: 'pause',
      reason: reason || 'Manual pause',
      performedBy: authResult.user.uid,
      performedAt: new Date(),
      previousStatus: campaign.status
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign paused successfully',
      campaignId,
      status: 'paused'
    });

  } catch (error) {
    console.error('Error pausing campaign:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to pause campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
