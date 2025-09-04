import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';

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

    // Check if already active
    if (campaign.status === 'active') {
      return NextResponse.json({ error: 'Campaign is already active' }, { status: 400 });
    }

    // Check if campaign has expired
    const now = new Date();
    const endDate = campaign.endAt?.toDate();
    if (endDate && endDate < now) {
      return NextResponse.json({ error: 'Cannot resume expired campaign' }, { status: 400 });
    }

    // Update campaign status
    await campaignRef.update({
      status: 'active',
      resumedAt: new Date(),
      updatedAt: new Date(),
      pausedAt: null,
      pauseReason: null
    });

    // Log the action
    await adminDb!.collection('campaignLogs').add({
      campaignId,
      action: 'resume',
      performedBy: authResult.user.uid,
      performedAt: new Date(),
      previousStatus: campaign.status
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign resumed successfully',
      campaignId,
      status: 'active'
    });

  } catch (error) {
    console.error('Error resuming campaign:', error);

    return NextResponse.json(
      { error: 'Failed to resume campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
