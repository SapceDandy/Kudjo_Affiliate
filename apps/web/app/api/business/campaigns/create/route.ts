import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CreateCampaignSchema } from '@/lib/schemas/campaign-wizard';
import { getCurrentUser } from '@/lib/auth-server';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const campaignData = CreateCampaignSchema.parse(body);

    // Validate date range
    const startDate = new Date(campaignData.basics.startDate);
    const endDate = new Date(campaignData.basics.endDate);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: { code: 'INVALID_DATE_RANGE', message: 'End date must be after start date' } },
        { status: 400 }
      );
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: { code: 'INVALID_START_DATE', message: 'Start date cannot be in the past' } },
        { status: 400 }
      );
    }

    // Validate follower range
    if (campaignData.targeting.minFollowers && campaignData.targeting.maxFollowers) {
      if (campaignData.targeting.minFollowers >= campaignData.targeting.maxFollowers) {
        return NextResponse.json(
          { error: { code: 'INVALID_FOLLOWER_RANGE', message: 'Max followers must be greater than min followers' } },
          { status: 400 }
        );
      }
    }

    // Get business info
    const businessRef = adminDb.collection('businesses').doc(user.uid);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: { code: 'BUSINESS_NOT_FOUND', message: 'Business profile not found' } },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();
    const now = new Date();
    const offerId = nanoid();

    // Create the campaign/offer
    const offerData = {
      id: offerId,
      bizId: user.uid,
      businessName: businessData?.name || 'Unknown Business',
      title: campaignData.basics.title,
      description: campaignData.basics.description,
      category: campaignData.basics.category,
      splitPct: campaignData.rewards.splitPct,
      userDiscountPct: campaignData.rewards.userDiscountPct,
      minSpend: campaignData.rewards.minSpend || 0,
      maxRedemptions: campaignData.rewards.maxRedemptions,
      cooldownHours: campaignData.rewards.cooldownHours,
      budget: campaignData.basics.budget,
      
      // Targeting
      eligibility: {
        tiers: campaignData.targeting.eligibleTiers,
        minFollowers: campaignData.targeting.minFollowers,
        maxFollowers: campaignData.targeting.maxFollowers,
        requiredPlatforms: campaignData.targeting.requiredPlatforms || [],
        locationRadius: campaignData.targeting.locationRadius,
      },
      maxInfluencers: campaignData.targeting.maxInfluencers,
      currentInfluencers: 0,
      targetAudience: campaignData.targeting.targetAudience,
      
      // Content requirements
      contentRequirements: campaignData.rewards.contentRequirements,
      
      // Dates
      startAt: startDate,
      endAt: endDate,
      
      // Status
      active: startDate <= now && endDate > now,
      status: startDate > now ? 'scheduled' : 'active',
      
      // Metadata
      createdAt: now,
      updatedAt: now,
      
      // Health metrics
      health: {
        score: 100, // Start with perfect health
        issues: [],
        lastChecked: now,
      },
      
      // Performance tracking
      metrics: {
        views: 0,
        applications: 0,
        approvals: 0,
        redemptions: 0,
        revenue: 0,
        spend: 0,
      },
    };

    // Save to Firestore
    await adminDb.collection('offers').doc(offerId).set(offerData);

    // Create campaign health record
    await adminDb.collection('campaignHealth').doc(offerId).set({
      offerId,
      bizId: user.uid,
      healthScore: 100,
      issues: [],
      recommendations: [],
      lastAnalyzed: now,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      campaignId: offerId,
      campaign: {
        id: offerId,
        title: campaignData.basics.title,
        status: offerData.status,
        startDate: campaignData.basics.startDate,
        endDate: campaignData.basics.endDate,
        budget: campaignData.basics.budget,
        maxInfluencers: campaignData.targeting.maxInfluencers,
        healthScore: 100,
      },
    });

  } catch (error) {
    console.error('Campaign creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid campaign data', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create campaign' } },
      { status: 500 }
    );
  }
}
