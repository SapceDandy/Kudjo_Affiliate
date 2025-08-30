import { z } from 'zod';

export const UserRole = z.enum(['influencer', 'business', 'admin']);

export const BusinessSchema = z.object({
  ownerUid: z.string(),
  name: z.string().min(2),
  address: z.string(),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  hours: z.record(z.any()).optional(),
  cuisine: z.string().optional(),
  avgTicket: z.number().optional(),
  posProvider: z.enum(['square', 'toast', 'clover', 'manual']),
  posStatus: z.enum(['disconnected', 'connected', 'error']).default('disconnected'),
  defaultSplitPct: z.number().min(0).max(100),
  rules: z.object({
    minSpend: z.number().optional(),
    blackout: z.array(z.string()).optional(),
    hours: z.array(z.string()).optional(),
  }).optional(),
  status: z.enum(['active', 'paused', 'closed']).default('active'),
});

// NEW: Influencer schema additions for follower count and tier
export const InfluencerSchema = z.object({
  ownerId: z.string(),
  handle: z.string().min(2),
  followerCount: z.number().int().nonnegative().default(0),
  tier: z.enum(['Small', 'Medium', 'Large', 'XL', 'Huge']).default('Small'),
  approved: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const OfferSchema = z.object({
  bizId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  splitPct: z.number().min(0).max(100),
  publicCode: z.string(),
  minSpend: z.number().optional(),
  blackout: z.array(z.string()).optional(),
  startAt: z.string(),
  endAt: z.string().optional(),
  status: z.enum(['active', 'paused', 'ended']).default('active'),
});

// NEW: Unified coupon schema
export const CouponType = z.enum(['AFFILIATE', 'CONTENT_MEAL']);
export const CouponStatus = z.enum(['issued', 'active', 'redeemed', 'expired']);

export const CouponSchema = z.object({
  type: CouponType,
  bizId: z.string(),
  infId: z.string(),
  offerId: z.string(),
  linkId: z.string().optional(), // for affiliate coupons
  code: z.string(),
  status: CouponStatus.default('issued'),
  cap_cents: z.number().int().nonnegative().optional(),
  deadlineAt: z.string().optional(),
  createdAt: z.string(),
  admin: z.object({
    posAdded: z.boolean().default(false),
    posAddedAt: z.string().optional(),
    notes: z.string().optional(),
  }),
});

// NEW: Daily stats aggregation schema
export const CouponStatsDailySchema = z.object({
  couponId: z.string(),
  bizId: z.string(),
  infId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  uses: z.number().int().nonnegative().default(0),
  revenue_cents: z.number().int().nonnegative().default(0),
  payouts_cents: z.number().int().nonnegative().default(0),
});

export const AffiliateLinkSchema = z.object({
  bizId: z.string(),
  infId: z.string(),
  offerId: z.string(),
  shortCode: z.string(),
  url: z.string().url(),
  qrUrl: z.string().url(),
  status: z.enum(['active', 'paused']).default('active'),
  createdAt: z.string(),
});

// UPDATED: Enhanced redemption schema
export const RedemptionSource = z.enum(['affiliate', 'content_meal']);
export const RedemptionStatus = z.enum(['pending', 'payable', 'paid']);

export const RedemptionSchema = z.object({
  couponId: z.string(),
  linkId: z.string().optional(),
  bizId: z.string(),
  infId: z.string(),
  offerId: z.string(),
  source: RedemptionSource,
  amount_cents: z.number().int().nonnegative(),
  discount_cents: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  eventId: z.string().optional(),
  createdAt: z.string(),
  status: RedemptionStatus.default('pending'),
  holdUntil: z.string().optional(),
});

// NEW: Payout schema
export const PayoutSchema = z.object({
  infId: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  total_payable_cents: z.number().int().nonnegative(),
  status: z.enum(['pending', 'processing', 'paid', 'failed']).default('pending'),
  createdAt: z.string(),
  paidAt: z.string().optional(),
});

export const FraudFlagSchema = z.object({
  entityType: z.enum(['card', 'device', 'user']),
  entityKey: z.string(),
  reason: z.string(),
  count: z.number().int().nonnegative(),
  lastSeenAt: z.string(),
  action: z.enum(['allow', 'review', 'block']),
});

export const OutreachCampaignSchema = z.object({
  name: z.string(),
  fromAccount: z.string(),
  status: z.enum(['draft', 'running', 'paused', 'done']).default('draft'),
  rateLimitPerMin: z.number().int().positive(),
  templateId: z.string(),
  createdAt: z.string(),
});

export const OutreachRecipientSchema = z.object({
  email: z.string().email(),
  bizName: z.string().optional(),
  state: z.enum(['queued', 'sent', 'opened', 'replied', 'bounced', 'unsub']).default('queued'),
  lastEventAt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// API payload schemas
export const ApiBusinessCreate = BusinessSchema.pick({
  name: true,
  address: true,
  posProvider: true,
  defaultSplitPct: true,
}).extend({ geo: z.object({ lat: z.number(), lng: z.number() }).optional() });

export const ApiBusinessPosConnect = z.object({
  bizId: z.string(),
  provider: z.enum(['square', 'manual', 'clover']).default('manual'),
  code: z.string().optional(),
  credentials: z.record(z.any()).optional(),
});

export const ApiOfferCreate = OfferSchema.pick({ bizId: true, title: true, description: true, splitPct: true, minSpend: true, blackout: true, startAt: true, endAt: true });

// NEW: Coupon API schemas
export const ApiCouponCreate = z.object({
  type: CouponType,
  bizId: z.string(),
  infId: z.string(),
  offerId: z.string(),
});

export const ApiCouponPosFlag = z.object({
  couponId: z.string(),
  posAdded: z.boolean(),
});

export const ApiCouponUsageRecord = z.object({
  couponId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  uses: z.number().int().nonnegative(),
  revenue_cents: z.number().int().nonnegative().optional(),
});

export const ApiAdminCouponsListQuery = z.object({
  status: CouponStatus.optional(),
  bizId: z.string().optional(),
  infId: z.string().optional(),
  type: CouponType.optional(),
  q: z.string().optional(), // search query
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// DEPRECATED: Keep for migration compatibility
export const CouponSchema_Legacy = z.object({
  bizId: z.string(),
  infId: z.string(),
  offerId: z.string(),
  code: z.string(),
  qrUrl: z.string().url(),
  singleUse: z.literal(true),
  status: z.enum(['issued', 'redeemed', 'expired']).default('issued'),
  expiresAt: z.string().optional(),
  rules: z.record(z.any()).optional(),
  redeemedAt: z.string().optional(),
  redemptionCardHash: z.string().optional(),
  redeemedOrderId: z.string().optional(),
});

export const ApiCouponClaim = z.object({ offerId: z.string(), infId: z.string() });

export const ApiLinkCreate = z.object({ offerId: z.string(), infId: z.string() });

export const ApiOutreachSend = z.object({ campaignId: z.string() }); 