import { z } from 'zod';

// Unified Coupons Schema
export const CouponSchema = z.object({
  id: z.string(),
  type: z.enum(['AFFILIATE', 'CONTENT_MEAL']),
  bizId: z.string(),
  infId: z.string(),
  offerId: z.string(),
  linkId: z.string().optional(),
  code: z.string(),
  status: z.enum(['active', 'used', 'expired', 'revoked']),
  capCents: z.number().optional(),
  deadlineAt: z.date().optional(),
  admin: z.object({
    posAdded: z.boolean().default(false),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Coupon = z.infer<typeof CouponSchema>;

// Join Campaign Schema
export const JoinCampaignSchema = z.object({
  offerId: z.string().min(1, 'Offer ID is required'),
  infId: z.string().min(1, 'Influencer ID is required'),
  legalAccepted: z.boolean().refine(val => val === true, {
    message: 'Legal terms must be accepted'
  }),
});

export type JoinCampaignRequest = z.infer<typeof JoinCampaignSchema>;

export const JoinCampaignResponseSchema = z.object({
  success: z.boolean(),
  coupons: z.object({
    affiliate: z.object({
      id: z.string(),
      code: z.string(),
      qrUrl: z.string(),
      linkId: z.string(),
      linkUrl: z.string(),
    }),
    contentMeal: z.object({
      id: z.string(),
      code: z.string(),
      qrUrl: z.string(),
    }),
  }),
  deadlines: z.object({
    postWithin: z.string(), // "7 days"
    keepPosted: z.string(), // "7-14 days"
  }),
});

export type JoinCampaignResponse = z.infer<typeof JoinCampaignResponseSchema>;

// Legacy support
export const CouponCreateSchema = z.object({
  type: z.enum(['AFFILIATE', 'CONTENT_MEAL']),
  bizId: z.string().min(1, 'Business ID is required'),
  infId: z.string().min(1, 'Influencer ID is required'),
  offerId: z.string().min(1, 'Offer ID is required'),
  override: z.boolean().optional(),
});

export type CouponCreateRequest = z.infer<typeof CouponCreateSchema>;

export const CouponCreateResponseSchema = z.object({
  couponId: z.string(),
  code: z.string(),
  qrUrl: z.string().optional(),
  link: z.object({
    linkId: z.string(),
    url: z.string(),
    qrUrl: z.string(),
  }).optional(),
});

export type CouponCreateResponse = z.infer<typeof CouponCreateResponseSchema>;

// Available Campaigns Schema
export const AvailableCampaignsSchema = z.object({
  infId: z.string().min(1, 'Influencer ID is required'),
  tier: z.enum(['S', 'M', 'L', 'XL', 'Huge']).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

export type AvailableCampaignsRequest = z.infer<typeof AvailableCampaignsSchema>;
export type AvailableCampaignsResponse = {
  campaigns: Array<{
    id: string;
    title: string;
    description?: string;
    splitPct: number;
    minSpend?: number;
    bizId: string;
    businessName?: string;
    active: boolean;
    endAt?: string;
    maxInfluencers?: number;
    currentInfluencers?: number;
  }>;
  hasMore: boolean;
};

// Manual Redemption Schema
export const ManualRedemptionSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required'),
  amountCents: z.number().min(1, 'Amount must be greater than 0'),
  timestamp: z.date().optional(),
  notes: z.string().optional(),
});

export type ManualRedemptionRequest = z.infer<typeof ManualRedemptionSchema>;

// CSV Import Schema
export const CSVImportRequestSchema = z.object({
  csvData: z.array(z.object({
    couponCode: z.string(),
    amountCents: z.number(),
    timestamp: z.string().optional(),
    notes: z.string().optional(),
  })),
});

export type CSVImportRequest = z.infer<typeof CSVImportRequestSchema>;
