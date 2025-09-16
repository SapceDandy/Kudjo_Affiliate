import { z } from 'zod';

// Campaign schema
export const CampaignSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  couponTemplateId: z.string(),
  name: z.string(),
  description: z.string(),
  visibility: z.enum(['invite_only', 'public']),
  eligibilityTags: z.array(z.string()).default([]),
  payout: z.object({
    type: z.enum(['flat', 'percent']),
    value: z.number().min(0)
  }),
  budget: z.number().min(0).optional(),
  startAt: z.date(),
  endAt: z.date(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  metrics: z.object({
    impressions: z.number().default(0),
    clicks: z.number().default(0),
    redemptions: z.number().default(0),
    revenue: z.number().default(0),
    participants: z.number().default(0)
  }).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
}).transform((data) => JSON.parse(JSON.stringify(data)));

// Affiliate Links schema
export const AffiliateLinkSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  influencerId: z.string(),
  businessId: z.string(),
  code: z.string(),
  url: z.string(),
  status: z.enum(['pending', 'accepted', 'declined', 'active', 'ended']),
  payoutTerms: z.object({
    type: z.enum(['flat', 'percent']),
    value: z.number().min(0)
  }),
  lifetimeEarnings: z.number().default(0),
  pendingEarnings: z.number().default(0),
  lastPayoutAt: z.date().nullable().default(null),
  lastPayoutId: z.string().nullable().default(null),
  createdAt: z.date()
}).transform((data) => JSON.parse(JSON.stringify(data)));

// Payouts schema
export const PayoutSchema = z.object({
  id: z.string(),
  influencerId: z.string(),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  linkIds: z.array(z.string()),
  periodStart: z.date(),
  periodEnd: z.date(),
  method: z.string(),
  status: z.enum(['pending', 'approved', 'paid', 'failed']),
  externalRef: z.string().nullable().default(null),
  createdAt: z.date(),
  approvedAt: z.date().nullable().default(null),
  paidAt: z.date().nullable().default(null),
  notes: z.string().optional()
}).transform((data) => JSON.parse(JSON.stringify(data)));

// API request/response schemas
export const CreateCampaignSchema = z.object({
  businessId: z.string(),
  couponTemplateId: z.string(),
  name: z.string().min(1),
  description: z.string().min(1),
  visibility: z.enum(['invite_only', 'public']),
  eligibilityTags: z.array(z.string()).default([]),
  payout: z.object({
    type: z.enum(['flat', 'percent']),
    value: z.number().min(0)
  }),
  budget: z.number().min(0).optional(),
  startAt: z.string().transform((str) => new Date(str)),
  endAt: z.string().transform((str) => new Date(str))
});

export const AcceptCampaignSchema = z.object({
  campaignId: z.string(),
  influencerId: z.string()
});

export const RequestPayoutSchema = z.object({
  influencerId: z.string(),
  linkIds: z.array(z.string()).min(1),
  method: z.string().min(1)
});

// Type exports
export type Campaign = z.infer<typeof CampaignSchema>;
export type AffiliateLink = z.infer<typeof AffiliateLinkSchema>;
export type Payout = z.infer<typeof PayoutSchema>;
export type CreateCampaignRequest = z.infer<typeof CreateCampaignSchema>;
export type AcceptCampaignRequest = z.infer<typeof AcceptCampaignSchema>;
export type RequestPayoutRequest = z.infer<typeof RequestPayoutSchema>;
