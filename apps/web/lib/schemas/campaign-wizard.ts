import { z } from 'zod';

export const CampaignWizardStepSchema = z.object({
  step: z.enum(['basics', 'targeting', 'rewards', 'review']),
  completed: z.boolean(),
});

export const CampaignBasicsSchema = z.object({
  title: z.string().min(1, 'Campaign title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['food', 'retail', 'beauty', 'fitness', 'entertainment', 'other']),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().min(100, 'Minimum budget is $100'),
});

export const CampaignTargetingSchema = z.object({
  eligibleTiers: z.array(z.enum(['bronze', 'silver', 'gold', 'platinum'])).min(1, 'Select at least one tier'),
  maxInfluencers: z.number().min(1, 'Must allow at least 1 influencer').max(1000, 'Maximum 1000 influencers'),
  minFollowers: z.number().min(0).optional(),
  maxFollowers: z.number().min(0).optional(),
  requiredPlatforms: z.array(z.enum(['instagram', 'tiktok'])).optional(),
  locationRadius: z.number().min(0).max(100).optional(), // miles
  targetAudience: z.string().optional(),
});

export const CampaignRewardsSchema = z.object({
  splitPct: z.number().min(5, 'Minimum 5% split').max(50, 'Maximum 50% split'),
  userDiscountPct: z.number().min(5, 'Minimum 5% discount').max(50, 'Maximum 50% discount'),
  minSpend: z.number().min(0).optional(),
  maxRedemptions: z.number().min(1).optional(),
  cooldownHours: z.number().min(0).max(168).default(24), // max 1 week
  contentRequirements: z.object({
    postRequired: z.boolean().default(true),
    storyRequired: z.boolean().default(false),
    videoRequired: z.boolean().default(false),
    minPostDays: z.number().min(1).max(30).default(7),
    hashtags: z.array(z.string()).optional(),
  }),
});

export const CampaignWizardDataSchema = z.object({
  basics: CampaignBasicsSchema.optional(),
  targeting: CampaignTargetingSchema.optional(),
  rewards: CampaignRewardsSchema.optional(),
  currentStep: z.enum(['basics', 'targeting', 'rewards', 'review']).default('basics'),
  completedSteps: z.array(z.enum(['basics', 'targeting', 'rewards', 'review'])).default([]),
});

export const CreateCampaignSchema = z.object({
  basics: CampaignBasicsSchema,
  targeting: CampaignTargetingSchema,
  rewards: CampaignRewardsSchema,
});

export type CampaignWizardStep = z.infer<typeof CampaignWizardStepSchema>;
export type CampaignBasics = z.infer<typeof CampaignBasicsSchema>;
export type CampaignTargeting = z.infer<typeof CampaignTargetingSchema>;
export type CampaignRewards = z.infer<typeof CampaignRewardsSchema>;
export type CampaignWizardData = z.infer<typeof CampaignWizardDataSchema>;
export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;
