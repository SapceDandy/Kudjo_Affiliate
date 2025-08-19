export type UserRole = 'influencer' | 'business' | 'admin';

export interface UserDoc {
  role: UserRole;
  email: string;
  phone: string;
  name: string;
  handle?: string;
  status: 'active' | 'disabled' | 'pending';
  createdAt: string; // ISO
}

export type PosProvider = 'square' | 'toast' | 'clover' | 'manual';
export type PosStatus = 'disconnected' | 'connected' | 'error';

export interface BusinessDoc {
  ownerUid: string;
  name: string;
  address: string;
  geo?: { lat: number; lng: number };
  hours?: Record<string, { open: string; close: string }[]>;
  cuisine?: string;
  avgTicket?: number;
  posProvider: PosProvider;
  posStatus: PosStatus;
  defaultSplitPct: number;
  rules?: { minSpend?: number; blackout?: string[]; hours?: string[] };
  status: 'active' | 'paused' | 'closed';
}

export interface InfluencerDoc {
  ownerUid: string;
  handle: string;
  reachMetrics?: { followers?: number; avgViews?: number };
  geo?: { lat: number; lng: number };
  tiers?: string[];
  status: 'active' | 'paused' | 'banned';
}

export interface OfferDoc {
  bizId: string;
  title: string;
  description?: string;
  splitPct: number;
  publicCode: string;
  minSpend?: number;
  blackout?: string[];
  startAt: string;
  endAt?: string;
  status: 'active' | 'paused' | 'ended';
}

// NEW: Unified coupon model replacing ContentCouponDoc
export type CouponType = 'AFFILIATE' | 'CONTENT_MEAL';
export type CouponStatus = 'issued' | 'active' | 'redeemed' | 'expired';

export interface CouponDoc {
  type: CouponType;
  bizId: string;
  infId: string;
  offerId: string;
  linkId?: string; // for affiliate coupons only
  code: string; // human-readable code for POS
  status: CouponStatus;
  cap_cents?: number; // for content meal coupons
  deadlineAt?: string; // 7 days for content meal
  createdAt: string;
  admin: {
    posAdded: boolean;
    posAddedAt?: string;
    notes?: string;
  };
}

// NEW: Daily aggregation for charts
export interface CouponStatsDailyDoc {
  couponId: string;
  bizId: string;
  infId: string;
  date: string; // YYYY-MM-DD
  uses: number;
  revenue_cents: number;
  payouts_cents: number;
}

export interface AffiliateLinkDoc {
  bizId: string;
  infId: string;
  offerId: string;
  shortCode: string;
  url: string;
  qrUrl: string;
  status: 'active' | 'paused';
  createdAt: string;
}

export type RedemptionSource = 'affiliate' | 'content_meal';
export type RedemptionStatus = 'pending' | 'payable' | 'paid';

// UPDATED: Enhanced redemption model
export interface RedemptionDoc {
  couponId: string;
  linkId?: string;
  bizId: string;
  infId: string;
  offerId: string;
  source: RedemptionSource;
  amount_cents: number;
  discount_cents: number;
  currency: string;
  eventId?: string; // from POS webhook
  createdAt: string;
  status: RedemptionStatus;
  holdUntil?: string; // for payout holds
}

// NEW: Payout aggregations
export interface PayoutDoc {
  infId: string;
  period_start: string;
  period_end: string;
  total_payable_cents: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  createdAt: string;
  paidAt?: string;
}

export type FraudEntityType = 'card' | 'device' | 'user';

export interface FraudFlagDoc {
  entityType: FraudEntityType;
  entityKey: string;
  reason: string;
  count: number;
  lastSeenAt: string;
  action: 'allow' | 'review' | 'block';
}

export interface OutreachCampaignDoc {
  name: string;
  fromAccount: string;
  status: 'draft' | 'running' | 'paused' | 'done';
  rateLimitPerMin: number;
  templateId: string;
  createdAt: string;
}

export interface OutreachRecipientDoc {
  email: string;
  bizName?: string;
  state: 'queued' | 'sent' | 'opened' | 'replied' | 'bounced' | 'unsub';
  lastEventAt?: string;
  metadata?: Record<string, unknown>;
}

// DEPRECATED: Keep for migration compatibility
export interface ContentCouponDoc {
  bizId: string;
  infId: string;
  offerId: string;
  code: string;
  qrUrl: string;
  singleUse: true;
  status: 'issued' | 'redeemed' | 'expired';
  expiresAt?: string;
  rules?: Record<string, unknown>;
  redeemedAt?: string;
  redemptionCardHash?: string;
  redeemedOrderId?: string;
} 