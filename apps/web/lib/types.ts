import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'business' | 'influencer';
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website?: string;
  ownerId: string;
  couponSettings: {
    defaultAmount: number;
    defaultType: 'percentage' | 'fixed';
    minAmount?: number;
    maxAmount?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Coupon {
  id: string;
  code: string;
  businessId: string;
  influencerId: string;
  amount: number;
  type: 'percentage' | 'fixed';
  status: 'active' | 'inactive' | 'expired';
  usageCount: number;
  maxUses?: number;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Metrics {
  id: string;
  businessId: string;
  influencerId: string;
  couponId: string;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  date: Timestamp;
}
