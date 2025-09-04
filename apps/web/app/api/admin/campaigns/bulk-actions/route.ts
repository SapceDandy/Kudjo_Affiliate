import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/middleware/auth';
import { z } from 'zod';

const requestSchema = z.object({
  action: z.enum(['pause', 'resume', 'delete', 'update_budget']),
  campaignIds: z.array(z.string()).min(1).max(50),
  params: z.object({
    reason: z.string().optional(),
    newBudget: z.number().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  const authResult = await requireRole('admin')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, campaignIds, params } = requestSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const results = {
      successful: [] as string[],
      failed: [] as { campaignId: string; error: string }[]
    };

    // Process campaigns in batches to avoid Firestore limits
    for (let i = 0; i < campaignIds.length; i += 10) {
      const batch = adminDb!.batch();
      const batchCampaignIds = campaignIds.slice(i, i + 10);

      for (const campaignId of batchCampaignIds) {
        try {
          const campaignRef = adminDb!.collection('offers').doc(campaignId);
          const campaignDoc = await campaignRef.get();

          if (!campaignDoc.exists) {
            results.failed.push({ campaignId, error: 'Campaign not found' });
            continue;
          }

          const campaign = campaignDoc.data()!;
          const now = new Date();

          switch (action) {
            case 'pause':
              if (campaign.status === 'paused') {
                results.failed.push({ campaignId, error: 'Already paused' });
                continue;
              }
              batch.update(campaignRef, {
                status: 'paused',
                pausedAt: now,
                pauseReason: params?.reason || 'Bulk pause',
                updatedAt: now
              });
              break;

            case 'resume':
              if (campaign.status === 'active') {
                results.failed.push({ campaignId, error: 'Already active' });
                continue;
              }
              const endDate = campaign.endAt?.toDate();
              if (endDate && endDate < now) {
                results.failed.push({ campaignId, error: 'Campaign expired' });
                continue;
              }
              batch.update(campaignRef, {
                status: 'active',
                resumedAt: now,
                updatedAt: now,
                pausedAt: null,
                pauseReason: null
              });
              break;

            case 'delete':
              // Soft delete by setting status to 'deleted'
              batch.update(campaignRef, {
                status: 'deleted',
                deletedAt: now,
                updatedAt: now
              });
              break;

            case 'update_budget':
              if (!params?.newBudget) {
                results.failed.push({ campaignId, error: 'New budget required' });
                continue;
              }
              batch.update(campaignRef, {
                budgetCents: Math.round(params.newBudget * 100),
                updatedAt: now
              });
              break;
          }

          // Log the bulk action
          const logRef = adminDb!.collection('campaignLogs').doc();
          batch.set(logRef, {
            campaignId,
            action: `bulk_${action}`,
            performedBy: authResult.user.uid,
            performedAt: now,
            previousStatus: campaign.status,
            bulkAction: true,
            params
          });

          results.successful.push(campaignId);

        } catch (error) {
          results.failed.push({ 
            campaignId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Commit the batch
      if (results.successful.length > 0) {
        await batch.commit();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      results: {
        total: campaignIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        details: results
      }
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
