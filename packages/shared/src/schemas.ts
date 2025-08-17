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

export const CouponSchema = z.object({
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

export const RedemptionSchema = z.object({
  bizId: z.string(),
  infId: z.string().optional(),
  offerId: z.string(),
  couponId: z.string().optional(),
  orderId: z.string(),
  orderTotal: z.number().nonnegative(),
  discountAmt: z.number().nonnegative(),
  netRevenue: z.number().nonnegative(),
  cardHash: z.string().optional(),
  deviceHash: z.string().optional(),
  ip: z.string().optional(),
  posRef: z.string().optional(),
  source: z.enum(['content', 'affiliate']),
  createdAt: z.string(),
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

export const ApiCouponClaim = z.object({ offerId: z.string(), infId: z.string() });

export const ApiLinkCreate = z.object({ offerId: z.string(), infId: z.string() });

export const ApiOutreachSend = z.object({ campaignId: z.string() }); 