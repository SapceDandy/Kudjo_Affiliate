import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const requestSchema = z.object({
  newTitle: z.string().optional(),
  adjustBudget: z.number().optional(),
  extendDuration: z.number().optional() // days to extend
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
    const { newTitle, adjustBudget, extendDuration } = requestSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get the original campaign
    const originalCampaignDoc = await adminDb.collection('offers').doc(campaignId).get();

    if (!originalCampaignDoc.exists) {
      return NextResponse.json({ error: 'Original campaign not found' }, { status: 404 });
    }

    const originalCampaign = originalCampaignDoc.data()!;

    // Create new campaign data
    const now = new Date();
    const originalEndDate = originalCampaign.endAt?.toDate() || new Date();
    const newEndDate = new Date(originalEndDate);
    
    if (extendDuration) {
      newEndDate.setDate(newEndDate.getDate() + extendDuration);
    }

    const newCampaignData = {
      ...originalCampaign,
      title: newTitle || `${originalCampaign.title} (Copy)`,
      budgetCents: adjustBudget ? Math.round(adjustBudget * 100) : originalCampaign.budgetCents,
      endAt: newEndDate,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      duplicatedFrom: campaignId,
      // Reset performance metrics
      totalRedemptions: 0,
      totalRevenue: 0,
      activeInfluencers: 0,
      // Remove any pause-related fields
      pausedAt: null,
      pauseReason: null,
      resumedAt: null
    };

    // Create the new campaign
    const newCampaignRef = await adminDb.collection('offers').add(newCampaignData);
    const newCampaignId = newCampaignRef.id;

    // Log the duplication action
    await adminDb.collection('campaignLogs').add({
      campaignId: newCampaignId,
      action: 'duplicate',
      originalCampaignId: campaignId,
      performedBy: authResult.user.uid,
      performedAt: now,
      changes: {
        titleChanged: newTitle !== undefined,
        budgetAdjusted: adjustBudget !== undefined,
        durationExtended: extendDuration !== undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign duplicated successfully',
      originalCampaignId: campaignId,
      newCampaignId,
      newCampaign: {
        id: newCampaignId,
        title: newCampaignData.title,
        budget: newCampaignData.budgetCents / 100,
        endDate: newEndDate.toISOString(),
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error duplicating campaign:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to duplicate campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
