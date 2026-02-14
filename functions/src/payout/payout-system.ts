import admin from 'firebase-admin';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'check';
export type LedgerEntryType = 'earning' | 'payout' | 'adjustment' | 'fee' | 'refund';

export interface InfluencerBalance {
  influencerId: string;
  totalEarningsCents: number;
  totalPayoutsCents: number;
  pendingPayoutsCents: number;
  availableBalanceCents: number;
  currency: string;
  runningBalanceCents: number;
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

  private db() {
    return admin.firestore();
  }

  async calculateInfluencerBalance(influencerId: string): Promise<InfluencerBalance> {
    const db = this.db();

    const ledgerSnapshot = await db
      .collection('ledgerEntries')
      .where('influencerId', '==', influencerId)
      .orderBy('transactionDate', 'desc')
      .get();

    let totalEarningsCents = 0;
    let totalPayoutsCents = 0;
    let runningBalanceCents = 0;

    ledgerSnapshot.docs.forEach((doc) => {
      const d = doc.data() as any;
      const type = d.type as LedgerEntryType | undefined;
      const amountCents = Number(d.amountCents || 0);
      runningBalanceCents += amountCents;
      if (type === 'earning') totalEarningsCents += amountCents;
      if (type === 'payout') totalPayoutsCents += Math.abs(amountCents);
    });

    const pendingPayoutsSnapshot = await db
      .collection('payouts')
      .where('influencerId', '==', influencerId)
      .where('status', 'in', ['pending', 'processing'])
      .get();

    const pendingPayoutsCents = pendingPayoutsSnapshot.docs.reduce((sum, doc) => {
      return sum + Number((doc.data() as any).amountCents || 0);
    }, 0);

    const availableBalanceCents = Math.max(0, runningBalanceCents - pendingPayoutsCents);

    return {
      influencerId,
      totalEarningsCents,
      totalPayoutsCents,
      pendingPayoutsCents,
      availableBalanceCents,
      currency: 'USD',
      runningBalanceCents,
      lastUpdated: new Date(),
    };
  }

  async createPayoutRequest(params: {
    influencerId: string;
    amountCents: number;
    method: PayoutMethod;
    paymentDetails: Record<string, any>;
    createdBy: string;
  }): Promise<{ success: true; payoutId: string } | { success: false; error: string }> {
    const { influencerId, amountCents, method, paymentDetails, createdBy } = params;
    const db = this.db();

    const balance = await this.calculateInfluencerBalance(influencerId);
    if (balance.availableBalanceCents < amountCents) {
      return {
        success: false,
        error: `Insufficient balance. Available: $${(balance.availableBalanceCents / 100).toFixed(2)}`,
      };
    }

    const minimumPayoutCents = 2000;
    if (amountCents < minimumPayoutCents) {
      return {
        success: false,
        error: `Minimum payout amount is $${(minimumPayoutCents / 100).toFixed(2)}`,
      };
    }

    const influencerDoc = await db.collection('influencers').doc(influencerId).get();
    if (!influencerDoc.exists) {
      return { success: false, error: 'Influencer not found' };
    }

    const influencer = influencerDoc.data() as any;
    const now = new Date();

    const payoutRef = await db.collection('payouts').add({
      influencerId,
      influencerName: influencer?.name || influencer?.displayName || 'Unknown',
      amountCents,
      currency: 'USD',
      status: 'pending' as PayoutStatus,
      method,
      ...paymentDetails,
      requestedAt: now,
      createdBy,
      updatedAt: now,
    });

    const payoutId = payoutRef.id;

    await db.collection('ledgerEntries').add({
      influencerId,
      type: 'payout' as LedgerEntryType,
      amountCents: -amountCents,
      currency: 'USD',
      description: `Payout request ${payoutId}`,
      payoutId,
      runningBalanceCents: balance.runningBalanceCents - amountCents,
      transactionDate: now,
      createdAt: now,
      createdBy,
    });

    return { success: true, payoutId };
  }

  async processPayoutRequest(payoutId: string, processedBy: string): Promise<{ success: true } | { success: false; error: string }> {
    const db = this.db();

    const payoutRef = db.collection('payouts').doc(payoutId);
    const payoutDoc = await payoutRef.get();

    if (!payoutDoc.exists) {
      return { success: false, error: 'Payout request not found' };
    }

    const payout = payoutDoc.data() as any;
    if (payout.status !== 'pending') {
      return { success: false, error: `Payout is already ${payout.status}` };
    }

    const now = new Date();

    await payoutRef.update({
      status: 'processing',
      processedAt: now,
      updatedAt: now,
      processedBy,
    });

    // Deterministic "simulation": mark completed immediately with a fixed fee policy (0 for now).
    await payoutRef.update({
      status: 'completed',
      completedAt: now,
      processingFee: 0,
      updatedAt: now,
    });

    return { success: true };
  }
}

export const payoutSystem = PayoutSystem.getInstance();
