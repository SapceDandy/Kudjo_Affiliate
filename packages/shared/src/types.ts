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

export type RedemptionSource = 'content' | 'affiliate';

export interface RedemptionDoc {
  bizId: string;
  infId?: string;
  offerId: string;
  couponId?: string;
  orderId: string;
  orderTotal: number;
  discountAmt: number;
  netRevenue: number;
  cardHash?: string;
  deviceHash?: string;
  ip?: string;
  posRef?: string;
  source: RedemptionSource;
  createdAt: string;
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