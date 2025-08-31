import { Timestamp } from 'firebase-admin/firestore';

export type CouponType = 'AFFILIATE' | 'CONTENT_MEAL';
export type CouponStatus = 'active' | 'used' | 'expired' | 'revoked' | 'pending_verification';
export type DiscountType = 'percentage' | 'fixed_amount';

export interface UnifiedCoupon {
  id: string;
  code: string;
  type: CouponType;
  
  // Campaign/Offer details
  offerId: string;
  campaignTitle: string;
  businessId: string;
  businessName: string;
  
  // Influencer details
  influencerId: string;
  influencerName: string;
  influencerTier: string;
  
  // Discount configuration
  discountType: DiscountType;
  discountValue: number; // percentage or cents
  minSpendCents?: number;
  maxDiscountCents?: number;
  
  // Revenue sharing
  splitPct: number; // Percentage influencer gets (0 for content meals)
  
  // Usage tracking
  status: CouponStatus;
  usageCount: number;
  maxUses: number;
  
  // Timestamps
  createdAt: Timestamp | Date;
  expiresAt: Timestamp | Date;
  usedAt?: Timestamp | Date;
  revokedAt?: Timestamp | Date;
  
  // Content meal specific fields
  contentDeadline?: Timestamp | Date; // When content must be posted
  contentSubmittedAt?: Timestamp | Date;
  contentApprovedAt?: Timestamp | Date;
  contentUrl?: string;
  contentPlatform?: 'instagram' | 'tiktok' | 'youtube';
  
  // Compliance tracking
  postVerificationRequired: boolean;
  postVerificationStatus?: 'pending' | 'submitted' | 'approved' | 'rejected';
  postVerificationDeadline?: Timestamp | Date;
  complianceChecks: ComplianceCheck[];
  
  // Terms and legal
  termsAcceptedAt: Timestamp | Date;
  termsVersion: string;
  
  // QR code for easy redemption
  qrCodeUrl?: string;
  
  // Metadata
  createdBy: string; // User ID who created
  updatedAt: Timestamp | Date;
  notes?: string;
}

export interface ComplianceCheck {
  id: string;
  type: 'post_verification' | 'content_review' | 'terms_compliance';
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  checkedAt: Timestamp | Date;
  checkedBy?: string; // Admin user ID
  details?: string;
  evidence?: {
    url?: string;
    screenshot?: string;
    description?: string;
  };
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  couponCode: string;
  
  // Transaction details
  amountCents: number;
  discountCents: number;
  influencerEarningsCents: number;
  
  // Redemption context
  redeemedAt: Timestamp | Date;
  redemptionMethod: 'pos' | 'online' | 'manual';
  transactionId?: string;
  receiptUrl?: string;
  
  // Location (for POS redemptions)
  locationId?: string;
  locationName?: string;
  
  // Verification
  verifiedBy?: string; // Staff member or system
  verificationNotes?: string;
  
  // Fraud detection
  fraudScore?: number;
  fraudFlags?: string[];
  
  // Metadata
  createdBy: string;
  updatedAt: Timestamp | Date;
}

export class UnifiedCouponService {
  static generateCouponCode(type: CouponType, influencerId: string): string {
    const prefix = type === 'AFFILIATE' ? 'AFF' : 'MEAL';
    const influencerPrefix = influencerId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString(36).substring(-4).toUpperCase();
    
    return `${prefix}${influencerPrefix}${random}${timestamp}`;
  }

  static calculateExpiryDate(type: CouponType, campaignEndDate?: Date): Date {
    const now = new Date();
    
    if (type === 'CONTENT_MEAL') {
      // Content meal coupons expire in 7 days
      return new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    }
    
    // Affiliate coupons expire with campaign or in 30 days, whichever is sooner
    const defaultExpiry = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    if (campaignEndDate && campaignEndDate < defaultExpiry) {
      return campaignEndDate;
    }
    
    return defaultExpiry;
  }

  static calculateContentDeadline(createdAt: Date): Date {
    // Content must be posted within 7 days of coupon creation
    return new Date(createdAt.getTime() + (7 * 24 * 60 * 60 * 1000));
  }

  static calculatePostVerificationDeadline(contentSubmittedAt: Date): Date {
    // Post verification must be completed within 7 days of content submission
    return new Date(contentSubmittedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
  }

  static isExpired(coupon: UnifiedCoupon): boolean {
    const now = new Date();
    const expiryDate = coupon.expiresAt instanceof Date ? 
      coupon.expiresAt : 
      coupon.expiresAt.toDate();
    
    return expiryDate < now;
  }

  static isContentDeadlinePassed(coupon: UnifiedCoupon): boolean {
    if (!coupon.contentDeadline) return false;
    
    const now = new Date();
    const deadline = coupon.contentDeadline instanceof Date ? 
      coupon.contentDeadline : 
      coupon.contentDeadline.toDate();
    
    return deadline < now;
  }

  static isPostVerificationOverdue(coupon: UnifiedCoupon): boolean {
    if (!coupon.postVerificationDeadline) return false;
    
    const now = new Date();
    const deadline = coupon.postVerificationDeadline instanceof Date ? 
      coupon.postVerificationDeadline : 
      coupon.postVerificationDeadline.toDate();
    
    return deadline < now;
  }

  static getComplianceStatus(coupon: UnifiedCoupon): {
    overall: 'compliant' | 'pending' | 'overdue' | 'failed';
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check if expired
    if (this.isExpired(coupon)) {
      issues.push('Coupon has expired');
    }
    
    // Check content deadline for content meal coupons
    if (coupon.type === 'CONTENT_MEAL') {
      if (!coupon.contentSubmittedAt && this.isContentDeadlinePassed(coupon)) {
        issues.push('Content submission deadline passed');
      }
    }
    
    // Check post verification deadline
    if (coupon.postVerificationRequired && this.isPostVerificationOverdue(coupon)) {
      issues.push('Post verification deadline passed');
    }
    
    // Check compliance checks
    const failedChecks = coupon.complianceChecks.filter(check => check.status === 'failed');
    if (failedChecks.length > 0) {
      issues.push(`${failedChecks.length} compliance check(s) failed`);
    }
    
    const pendingChecks = coupon.complianceChecks.filter(check => check.status === 'pending');
    
    // Determine overall status
    if (issues.length > 0) {
      return { overall: 'failed', issues };
    }
    
    if (pendingChecks.length > 0) {
      return { overall: 'pending', issues: [] };
    }
    
    if (coupon.postVerificationRequired && 
        coupon.postVerificationStatus !== 'approved') {
      return { overall: 'pending', issues: [] };
    }
    
    return { overall: 'compliant', issues: [] };
  }
}

export default UnifiedCouponService;
