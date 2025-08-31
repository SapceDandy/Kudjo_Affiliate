import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export interface FraudCheckResult {
  score: number; // 0-100, higher = more suspicious
  flags: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  reason?: string;
}

export interface RedemptionContext {
  couponCode: string;
  amountCents: number;
  businessId: string;
  locationId?: string;
  customerInfo?: {
    email?: string;
    phone?: string;
    ipAddress?: string;
  };
  redemptionMethod: 'pos' | 'online' | 'manual';
  timestamp: Date;
}

export class FraudDetectionService {
  private static instance: FraudDetectionService;
  
  // Configurable thresholds
  private readonly MAX_REDEMPTIONS_PER_HOUR = 5;
  private readonly MAX_REDEMPTIONS_PER_DAY = 20;
  private readonly MAX_AMOUNT_PER_REDEMPTION = 50000; // $500
  private readonly MAX_DAILY_AMOUNT = 200000; // $2000
  private readonly VELOCITY_THRESHOLD_MINUTES = 5; // Min time between redemptions
  
  static getInstance(): FraudDetectionService {
    if (!FraudDetectionService.instance) {
      FraudDetectionService.instance = new FraudDetectionService();
    }
    return FraudDetectionService.instance;
  }

  async checkRedemption(context: RedemptionContext): Promise<FraudCheckResult> {
    const flags: string[] = [];
    let score = 0;

    if (!adminDb) {
      throw new Error('Database not available');
    }

    // Get coupon details
    const couponSnapshot = await adminDb.collection('coupons')
      .where('code', '==', context.couponCode)
      .limit(1)
      .get();

    if (couponSnapshot.empty) {
      return {
        score: 100,
        flags: ['INVALID_COUPON'],
        riskLevel: 'critical',
        blocked: true,
        reason: 'Coupon not found'
      };
    }

    const coupon = couponSnapshot.docs[0].data();
    const couponId = couponSnapshot.docs[0].id;

    // Check coupon status
    if (coupon.status !== 'active') {
      return {
        score: 100,
        flags: ['INACTIVE_COUPON'],
        riskLevel: 'critical',
        blocked: true,
        reason: `Coupon status: ${coupon.status}`
      };
    }

    // Check expiration
    const expiryDate = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
    if (expiryDate < context.timestamp) {
      return {
        score: 100,
        flags: ['EXPIRED_COUPON'],
        riskLevel: 'critical',
        blocked: true,
        reason: 'Coupon has expired'
      };
    }

    // Check usage limits
    if (coupon.usageCount >= coupon.maxUses) {
      return {
        score: 100,
        flags: ['USAGE_LIMIT_EXCEEDED'],
        riskLevel: 'critical',
        blocked: true,
        reason: 'Coupon usage limit exceeded'
      };
    }

    // Check business match
    if (coupon.businessId !== context.businessId) {
      flags.push('BUSINESS_MISMATCH');
      score += 50;
    }

    // Velocity checks
    const velocityResult = await this.checkVelocity(couponId, context);
    flags.push(...velocityResult.flags);
    score += velocityResult.score;

    // Amount checks
    const amountResult = this.checkAmount(context.amountCents, coupon);
    flags.push(...amountResult.flags);
    score += amountResult.score;

    // Pattern analysis
    const patternResult = await this.checkPatterns(coupon.influencerId, context);
    flags.push(...patternResult.flags);
    score += patternResult.score;

    // Location checks (for POS redemptions)
    if (context.redemptionMethod === 'pos' && context.locationId) {
      const locationResult = await this.checkLocation(context.businessId, context.locationId);
      flags.push(...locationResult.flags);
      score += locationResult.score;
    }

    // IP/Device checks (for online redemptions)
    if (context.customerInfo?.ipAddress) {
      const ipResult = await this.checkIP(context.customerInfo.ipAddress);
      flags.push(...ipResult.flags);
      score += ipResult.score;
    }

    // Determine risk level and blocking
    const riskLevel = this.calculateRiskLevel(score);
    const blocked = this.shouldBlock(score, flags);

    return {
      score: Math.min(score, 100),
      flags,
      riskLevel,
      blocked,
      reason: blocked ? this.getBlockReason(flags) : undefined
    };
  }

  private async checkVelocity(couponId: string, context: RedemptionContext): Promise<{ flags: string[]; score: number }> {
    const flags: string[] = [];
    let score = 0;

    const now = context.timestamp;
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

    // Check recent redemptions for this coupon
    const recentRedemptions = await adminDb.collection('redemptions')
      .where('couponId', '==', couponId)
      .where('redeemedAt', '>=', oneDayAgo)
      .get();

    const hourlyRedemptions = recentRedemptions.docs.filter(doc => {
      const redemptionTime = doc.data().redeemedAt?.toDate() || new Date(0);
      return redemptionTime >= oneHourAgo;
    });

    const recentRedemptions5min = recentRedemptions.docs.filter(doc => {
      const redemptionTime = doc.data().redeemedAt?.toDate() || new Date(0);
      return redemptionTime >= fiveMinutesAgo;
    });

    // Velocity checks
    if (recentRedemptions5min.length > 0) {
      flags.push('HIGH_VELOCITY');
      score += 30;
    }

    if (hourlyRedemptions.length >= this.MAX_REDEMPTIONS_PER_HOUR) {
      flags.push('HOURLY_LIMIT_EXCEEDED');
      score += 40;
    }

    if (recentRedemptions.docs.length >= this.MAX_REDEMPTIONS_PER_DAY) {
      flags.push('DAILY_LIMIT_EXCEEDED');
      score += 50;
    }

    return { flags, score };
  }

  private checkAmount(amountCents: number, coupon: any): { flags: string[]; score: number } {
    const flags: string[] = [];
    let score = 0;

    // Check if amount is unusually high
    if (amountCents > this.MAX_AMOUNT_PER_REDEMPTION) {
      flags.push('HIGH_AMOUNT');
      score += 25;
    }

    // Check minimum spend requirement
    if (coupon.minSpendCents && amountCents < coupon.minSpendCents) {
      flags.push('BELOW_MIN_SPEND');
      score += 20;
    }

    // Check if amount is suspiciously round (potential manual entry fraud)
    if (amountCents % 1000 === 0 && amountCents > 5000) { // Exact dollars over $50
      flags.push('ROUND_AMOUNT');
      score += 10;
    }

    return { flags, score };
  }

  private async checkPatterns(influencerId: string, context: RedemptionContext): Promise<{ flags: string[]; score: number }> {
    const flags: string[] = [];
    let score = 0;

    const oneDayAgo = new Date(context.timestamp.getTime() - (24 * 60 * 60 * 1000));

    // Check daily spending for this influencer
    const dailyRedemptions = await adminDb.collection('redemptions')
      .where('influencerId', '==', influencerId)
      .where('redeemedAt', '>=', oneDayAgo)
      .get();

    const dailyTotal = dailyRedemptions.docs.reduce((sum, doc) => {
      return sum + (doc.data().amountCents || 0);
    }, 0);

    if (dailyTotal + context.amountCents > this.MAX_DAILY_AMOUNT) {
      flags.push('DAILY_AMOUNT_EXCEEDED');
      score += 30;
    }

    // Check for unusual patterns (same amounts, same times)
    const amounts = dailyRedemptions.docs.map(doc => doc.data().amountCents);
    const sameAmountCount = amounts.filter(amount => amount === context.amountCents).length;

    if (sameAmountCount >= 3) {
      flags.push('REPEATED_AMOUNTS');
      score += 20;
    }

    return { flags, score };
  }

  private async checkLocation(businessId: string, locationId: string): Promise<{ flags: string[]; score: number }> {
    const flags: string[] = [];
    let score = 0;

    // Verify location belongs to business
    const locationDoc = await adminDb.collection('businesses')
      .doc(businessId)
      .collection('locations')
      .doc(locationId)
      .get();

    if (!locationDoc.exists) {
      flags.push('INVALID_LOCATION');
      score += 40;
    } else {
      const location = locationDoc.data()!;
      if (!location.active) {
        flags.push('INACTIVE_LOCATION');
        score += 30;
      }
    }

    return { flags, score };
  }

  private async checkIP(ipAddress: string): Promise<{ flags: string[]; score: number }> {
    const flags: string[] = [];
    let score = 0;

    // Check for blacklisted IPs
    const blacklistDoc = await adminDb.collection('fraudBlacklist')
      .doc('ips')
      .get();

    if (blacklistDoc.exists) {
      const blacklist = blacklistDoc.data()!;
      if (blacklist.addresses && blacklist.addresses.includes(ipAddress)) {
        flags.push('BLACKLISTED_IP');
        score += 60;
      }
    }

    // Check for VPN/Proxy (basic check - in production, use a service like MaxMind)
    if (this.isKnownVPN(ipAddress)) {
      flags.push('VPN_PROXY');
      score += 15;
    }

    return { flags, score };
  }

  private isKnownVPN(ipAddress: string): boolean {
    // Basic VPN detection - in production, integrate with a proper service
    const knownVPNRanges = [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16'
    ];
    
    // This is a simplified check - real implementation would use proper CIDR matching
    return knownVPNRanges.some(range => ipAddress.startsWith(range.split('/')[0].split('.').slice(0, 2).join('.')));
  }

  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private shouldBlock(score: number, flags: string[]): boolean {
    // Critical flags that always block
    const criticalFlags = [
      'INVALID_COUPON',
      'INACTIVE_COUPON',
      'EXPIRED_COUPON',
      'USAGE_LIMIT_EXCEEDED',
      'BLACKLISTED_IP'
    ];

    if (flags.some(flag => criticalFlags.includes(flag))) {
      return true;
    }

    // Block on high score
    return score >= 70;
  }

  private getBlockReason(flags: string[]): string {
    const flagMessages: Record<string, string> = {
      'INVALID_COUPON': 'Invalid coupon code',
      'INACTIVE_COUPON': 'Coupon is not active',
      'EXPIRED_COUPON': 'Coupon has expired',
      'USAGE_LIMIT_EXCEEDED': 'Coupon usage limit exceeded',
      'BUSINESS_MISMATCH': 'Coupon not valid at this business',
      'HIGH_VELOCITY': 'Too many recent redemptions',
      'HOURLY_LIMIT_EXCEEDED': 'Hourly redemption limit exceeded',
      'DAILY_LIMIT_EXCEEDED': 'Daily redemption limit exceeded',
      'HIGH_AMOUNT': 'Redemption amount too high',
      'DAILY_AMOUNT_EXCEEDED': 'Daily spending limit exceeded',
      'BLACKLISTED_IP': 'IP address is blacklisted',
      'INVALID_LOCATION': 'Invalid business location'
    };

    const criticalFlag = flags.find(flag => flagMessages[flag]);
    return criticalFlag ? flagMessages[criticalFlag] : 'Suspicious activity detected';
  }

  async logFraudAttempt(context: RedemptionContext, result: FraudCheckResult): Promise<void> {
    if (!adminDb) return;

    await adminDb.collection('fraudLogs').add({
      couponCode: context.couponCode,
      businessId: context.businessId,
      amountCents: context.amountCents,
      redemptionMethod: context.redemptionMethod,
      fraudScore: result.score,
      flags: result.flags,
      riskLevel: result.riskLevel,
      blocked: result.blocked,
      reason: result.reason,
      customerInfo: context.customerInfo || null,
      locationId: context.locationId || null,
      timestamp: context.timestamp,
      createdAt: new Date()
    });
  }
}

export const fraudDetection = FraudDetectionService.getInstance();
