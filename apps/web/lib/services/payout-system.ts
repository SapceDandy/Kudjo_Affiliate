import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'check';
export type LedgerEntryType = 'earning' | 'payout' | 'adjustment' | 'fee' | 'refund';

export interface PayoutRequest {
  id: string;
  influencerId: string;
  influencerName: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  method: PayoutMethod;
  
  // Banking details (encrypted in production)
  bankDetails?: {
    accountNumber: string;
    routingNumber: string;
    accountType: 'checking' | 'savings';
    bankName: string;
  };
  
  paypalEmail?: string;
  stripeAccountId?: string;
  
  // Processing details
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  
  // External references
  externalTransactionId?: string;
  processingFee?: number;
  
  // Metadata
  notes?: string;
  createdBy: string;
  updatedAt: Date;
}

export interface LedgerEntry {
  id: string;
  influencerId: string;
  type: LedgerEntryType;
  amountCents: number;
  currency: string;
  description: string;
  
  // References
  redemptionId?: string;
  payoutId?: string;
  campaignId?: string;
  businessId?: string;
  
  // Balance tracking
  runningBalanceCents: number;
  
  // Timestamps
  transactionDate: Date;
  createdAt: Date;
  
  // Metadata
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface InfluencerBalance {
  influencerId: string;
  totalEarningsCents: number;
  totalPayoutsCents: number;
  pendingPayoutsCents: number;
  availableBalanceCents: number;
  currency: string;
  lastUpdated: Date;
}

export class PayoutSystem {
  private static instance: PayoutSystem;
  
  static getInstance(): PayoutSystem {
    if (!PayoutSystem.instance) {
      PayoutSystem.instance = new PayoutSystem();
    }
    return PayoutSystem.instance;
  }

  async calculateInfluencerBalance(influencerId: string): Promise<InfluencerBalance> {
    if (!adminDb) throw new Error('Database not available');

    // Get all ledger entries for this influencer
    const ledgerSnapshot = await adminDb.collection('ledgerEntries')
      .where('influencerId', '==', influencerId)
      .orderBy('transactionDate', 'desc')
      .get();

    let totalEarnings = 0;
    let totalPayouts = 0;
    let runningBalance = 0;

    ledgerSnapshot.docs.forEach(doc => {
      const entry = doc.data() as LedgerEntry;
      
      switch (entry.type) {
        case 'earning':
          totalEarnings += entry.amountCents;
          runningBalance += entry.amountCents;
          break;
        case 'payout':
          totalPayouts += Math.abs(entry.amountCents);
          runningBalance -= Math.abs(entry.amountCents);
          break;
        case 'fee':
          runningBalance -= Math.abs(entry.amountCents);
          break;
        case 'adjustment':
          runningBalance += entry.amountCents; // Can be positive or negative
          break;
        case 'refund':
          runningBalance -= Math.abs(entry.amountCents);
          break;
      }
    });

    // Get pending payouts
    const pendingPayoutsSnapshot = await adminDb.collection('payouts')
      .where('influencerId', '==', influencerId)
      .where('status', 'in', ['pending', 'processing'])
      .get();

    const pendingPayouts = pendingPayoutsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().amountCents || 0);
    }, 0);

    const availableBalance = Math.max(0, runningBalance - pendingPayouts);

    return {
      influencerId,
      totalEarningsCents: totalEarnings,
      totalPayoutsCents: totalPayouts,
      pendingPayoutsCents: pendingPayouts,
      availableBalanceCents: availableBalance,
      currency: 'USD',
      lastUpdated: new Date()
    };
  }

  async recordEarning(
    influencerId: string,
    amountCents: number,
    redemptionId: string,
    campaignId: string,
    businessId: string,
    createdBy: string
  ): Promise<string> {
    if (!adminDb) throw new Error('Database not available');

    const now = new Date();
    const balance = await this.calculateInfluencerBalance(influencerId);
    const newBalance = balance.availableBalanceCents + amountCents;

    const ledgerEntry: Omit<LedgerEntry, 'id'> = {
      influencerId,
      type: 'earning',
      amountCents,
      currency: 'USD',
      description: `Earnings from redemption ${redemptionId}`,
      redemptionId,
      campaignId,
      businessId,
      runningBalanceCents: newBalance,
      transactionDate: now,
      createdAt: now,
      createdBy
    };

    const docRef = await adminDb.collection('ledgerEntries').add(ledgerEntry);
    return docRef.id;
  }

  async createPayoutRequest(
    influencerId: string,
    amountCents: number,
    method: PayoutMethod,
    paymentDetails: any,
    createdBy: string
  ): Promise<{ success: boolean; payoutId?: string; error?: string }> {
    if (!adminDb) throw new Error('Database not available');

    try {
      // Validate balance
      const balance = await this.calculateInfluencerBalance(influencerId);
      
      if (balance.availableBalanceCents < amountCents) {
        return {
          success: false,
          error: `Insufficient balance. Available: $${(balance.availableBalanceCents / 100).toFixed(2)}, Requested: $${(amountCents / 100).toFixed(2)}`
        };
      }

      // Minimum payout amount check
      const minimumPayout = 2000; // $20
      if (amountCents < minimumPayout) {
        return {
          success: false,
          error: `Minimum payout amount is $${(minimumPayout / 100).toFixed(2)}`
        };
      }

      // Get influencer details
      const influencerDoc = await adminDb.collection('influencers').doc(influencerId).get();
      if (!influencerDoc.exists) {
        return { success: false, error: 'Influencer not found' };
      }

      const influencer = influencerDoc.data()!;
      const now = new Date();

      // Create payout request
      const payoutRequest: Omit<PayoutRequest, 'id'> = {
        influencerId,
        influencerName: influencer.name || influencer.displayName || 'Unknown',
        amountCents,
        currency: 'USD',
        status: 'pending',
        method,
        ...paymentDetails,
        requestedAt: now,
        createdBy,
        updatedAt: now
      };

      const payoutRef = await adminDb.collection('payouts').add(payoutRequest);
      const payoutId = payoutRef.id;

      // Create ledger entry for pending payout
      await this.recordLedgerEntry({
        influencerId,
        type: 'payout',
        amountCents: -amountCents, // Negative for outgoing
        currency: 'USD',
        description: `Payout request ${payoutId}`,
        payoutId,
        runningBalanceCents: balance.availableBalanceCents - amountCents,
        transactionDate: now,
        createdAt: now,
        createdBy
      });

      return { success: true, payoutId };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payout request'
      };
    }
  }

  async processPayoutRequest(
    payoutId: string,
    processedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!adminDb) throw new Error('Database not available');

    try {
      const payoutRef = adminDb.collection('payouts').doc(payoutId);
      const payoutDoc = await payoutRef.get();

      if (!payoutDoc.exists) {
        return { success: false, error: 'Payout request not found' };
      }

      const payout = payoutDoc.data() as PayoutRequest;

      if (payout.status !== 'pending') {
        return { success: false, error: `Payout is already ${payout.status}` };
      }

      const now = new Date();

      // Update payout status to processing
      await payoutRef.update({
        status: 'processing',
        processedAt: now,
        updatedAt: now
      });

      // Here you would integrate with actual payment processors
      // For now, we'll simulate the processing
      const processingResult = await this.simulatePaymentProcessing(payout);

      if (processingResult.success) {
        // Mark as completed
        await payoutRef.update({
          status: 'completed',
          completedAt: now,
          externalTransactionId: processingResult.transactionId,
          processingFee: processingResult.fee || 0,
          updatedAt: now
        });

        // Record processing fee if applicable
        if (processingResult.fee && processingResult.fee > 0) {
          await this.recordLedgerEntry({
            influencerId: payout.influencerId,
            type: 'fee',
            amountCents: -processingResult.fee,
            currency: 'USD',
            description: `Processing fee for payout ${payoutId}`,
            payoutId,
            runningBalanceCents: 0, // Will be recalculated
            transactionDate: now,
            createdAt: now,
            createdBy: processedBy
          });
        }

        return { success: true };
      } else {
        // Mark as failed
        await payoutRef.update({
          status: 'failed',
          failedAt: now,
          notes: processingResult.error,
          updatedAt: now
        });

        // Reverse the payout ledger entry
        const balance = await this.calculateInfluencerBalance(payout.influencerId);
        await this.recordLedgerEntry({
          influencerId: payout.influencerId,
          type: 'adjustment',
          amountCents: payout.amountCents, // Positive to restore balance
          currency: 'USD',
          description: `Payout reversal for failed payout ${payoutId}`,
          payoutId,
          runningBalanceCents: balance.availableBalanceCents + payout.amountCents,
          transactionDate: now,
          createdAt: now,
          createdBy: processedBy
        });

        return { success: false, error: processingResult.error };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payout'
      };
    }
  }

  private async simulatePaymentProcessing(payout: PayoutRequest): Promise<{
    success: boolean;
    transactionId?: string;
    fee?: number;
    error?: string;
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      const fee = Math.round(payout.amountCents * 0.029); // 2.9% processing fee
      return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        fee
      };
    } else {
      return {
        success: false,
        error: 'Payment processor declined the transaction'
      };
    }
  }

  private async recordLedgerEntry(entry: Omit<LedgerEntry, 'id'>): Promise<string> {
    if (!adminDb) throw new Error('Database not available');

    const docRef = await adminDb.collection('ledgerEntries').add(entry);
    return docRef.id;
  }

  async getPayoutHistory(
    influencerId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PayoutRequest[]> {
    if (!adminDb) throw new Error('Database not available');

    let query = adminDb.collection('payouts').orderBy('requestedAt', 'desc');

    if (influencerId) {
      query = query.where('influencerId', '==', influencerId);
    }

    const snapshot = await query.limit(limit).offset(offset).get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PayoutRequest));
  }

  async getLedgerHistory(
    influencerId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<LedgerEntry[]> {
    if (!adminDb) throw new Error('Database not available');

    const snapshot = await adminDb.collection('ledgerEntries')
      .where('influencerId', '==', influencerId)
      .orderBy('transactionDate', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LedgerEntry));
  }

  async generatePayoutReport(
    startDate: Date,
    endDate: Date,
    businessId?: string
  ): Promise<{
    totalPayouts: number;
    totalFees: number;
    payoutCount: number;
    averagePayoutAmount: number;
    payoutsByStatus: Record<PayoutStatus, number>;
    payoutsByMethod: Record<PayoutMethod, number>;
  }> {
    if (!adminDb) throw new Error('Database not available');

    let query = adminDb.collection('payouts')
      .where('requestedAt', '>=', startDate)
      .where('requestedAt', '<=', endDate);

    const snapshot = await query.get();
    const payouts = snapshot.docs.map(doc => doc.data() as PayoutRequest);

    const totalPayouts = payouts.reduce((sum, p) => sum + p.amountCents, 0);
    const totalFees = payouts.reduce((sum, p) => sum + (p.processingFee || 0), 0);
    const payoutCount = payouts.length;
    const averagePayoutAmount = payoutCount > 0 ? totalPayouts / payoutCount : 0;

    const payoutsByStatus: Record<PayoutStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    const payoutsByMethod: Record<PayoutMethod, number> = {
      bank_transfer: 0,
      paypal: 0,
      stripe: 0,
      check: 0
    };

    payouts.forEach(payout => {
      payoutsByStatus[payout.status]++;
      payoutsByMethod[payout.method]++;
    });

    return {
      totalPayouts: totalPayouts / 100, // Convert to dollars
      totalFees: totalFees / 100,
      payoutCount,
      averagePayoutAmount: averagePayoutAmount / 100,
      payoutsByStatus,
      payoutsByMethod
    };
  }
}

export const payoutSystem = PayoutSystem.getInstance();
