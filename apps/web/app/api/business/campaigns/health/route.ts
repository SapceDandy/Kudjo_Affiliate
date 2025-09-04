import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/auth-server';

interface CampaignHealthIssue {
  type: 'low_applications' | 'high_rejection_rate' | 'poor_performance' | 'budget_exceeded' | 'ending_soon';
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
}

interface CampaignHealth {
  score: number;
  issues: CampaignHealthIssue[];
  recommendations: string[];
  lastAnalyzed: Date;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: { code: 'MISSING_CAMPAIGN_ID', message: 'Campaign ID is required' } },
        { status: 400 }
      );
    }

    // Get campaign data
    const campaignDoc = await adminDb!.collection('offers').doc(campaignId).get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();
    if (campaignData?.bizId !== user.uid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Analyze campaign health
    const health = await analyzeCampaignHealth(campaignId, campaignData);

    // Update health record
    await adminDb!.collection('campaignHealth').doc(campaignId).set({
      offerId: campaignId,
      bizId: user.uid,
      healthScore: health.score,
      issues: health.issues,
      recommendations: health.recommendations,
      lastAnalyzed: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      health: {
        score: health.score,
        issues: health.issues,
        recommendations: health.recommendations,
        lastAnalyzed: health.lastAnalyzed,
      },
    });

  } catch (error) {
    console.error('Campaign health check error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to check campaign health' } },
      { status: 500 }
    );
  }
}

async function analyzeCampaignHealth(campaignId: string, campaignData: any): Promise<CampaignHealth> {
  const issues: CampaignHealthIssue[] = [];
  const recommendations: string[] = [];
  let score = 100;

  const now = new Date();
  const startDate = campaignData.startAt?.toDate() || now;
  const endDate = campaignData.endAt?.toDate() || now;
  const daysRunning = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check application rate
  const expectedApplicationsPerDay = campaignData.maxInfluencers / Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const actualApplicationsPerDay = (campaignData.metrics?.applications || 0) / daysRunning;

  if (actualApplicationsPerDay < expectedApplicationsPerDay * 0.3) {
    issues.push({
      type: 'low_applications',
      severity: 'high',
      message: 'Low application rate detected',
      recommendation: 'Consider increasing split percentage or expanding eligible tiers'
    });
    recommendations.push('Increase influencer split percentage to attract more applications');
    recommendations.push('Expand eligible tiers to reach more influencers');
    score -= 25;
  }

  // Check performance metrics
  const redemptionRate = campaignData.metrics?.applications > 0 
    ? (campaignData.metrics?.redemptions || 0) / campaignData.metrics.applications 
    : 0;

  if (redemptionRate < 0.1 && campaignData.metrics?.applications > 5) {
    issues.push({
      type: 'poor_performance',
      severity: 'medium',
      message: 'Low redemption rate from influencers',
      recommendation: 'Review content requirements and minimum spend amount'
    });
    recommendations.push('Lower minimum spend requirement');
    recommendations.push('Simplify content requirements');
    score -= 15;
  }

  // Check budget utilization
  const budgetUsed = (campaignData.metrics?.spend || 0) / campaignData.budget;
  const timeElapsed = daysRunning / Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  if (budgetUsed > timeElapsed + 0.2) {
    issues.push({
      type: 'budget_exceeded',
      severity: 'high',
      message: 'Budget spending ahead of schedule',
      recommendation: 'Monitor spending closely or adjust campaign parameters'
    });
    recommendations.push('Consider reducing split percentage');
    recommendations.push('Add daily spending limits');
    score -= 20;
  }

  // Check if campaign is ending soon
  if (daysRemaining <= 3 && daysRemaining > 0) {
    issues.push({
      type: 'ending_soon',
      severity: 'low',
      message: `Campaign ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      recommendation: 'Consider extending campaign if performance is good'
    });
    if (redemptionRate > 0.15) {
      recommendations.push('Extend campaign duration to maximize results');
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    score,
    issues,
    recommendations,
    lastAnalyzed: now,
  };
}
