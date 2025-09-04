import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  period: '7d' | '30d' | '90d' | '1y';
}

export interface BusinessMetrics {
  businessId: string;
  businessName: string;
  totalRevenue: number;
  totalEarnings: number;
  conversions: number;
  uniqueInfluencers: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface InfluencerMetrics {
  influencerId: string;
  influencerName: string;
  tier: string;
  totalEarnings: number;
  conversions: number;
  averageEarningsPerConversion: number;
  activeCampaigns: number;
}

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  businessId: string;
  totalRevenue: number;
  totalEarnings: number;
  conversions: number;
  uniqueInfluencers: number;
  conversionRate: number;
  roas: number;
}

export class AnalyticsAggregator {
  private static instance: AnalyticsAggregator;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AnalyticsAggregator {
    if (!AnalyticsAggregator.instance) {
      AnalyticsAggregator.instance = new AnalyticsAggregator();
    }
    return AnalyticsAggregator.instance;
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  async getTopBusinesses(timeRange: AnalyticsTimeRange, limit: number = 10): Promise<BusinessMetrics[]> {
    const cacheKey = this.getCacheKey('topBusinesses', { timeRange, limit });
    const cached = this.getFromCache<BusinessMetrics[]>(cacheKey);
    if (cached) return cached;

    if (!adminDb) throw new Error('Database not available');

    // Get redemptions in time range
    const redemptionsSnapshot = await adminDb!.collection('redemptions')
      .where('redeemedAt', '>=', timeRange.start)
      .where('redeemedAt', '<=', timeRange.end)
      .get();

    // Aggregate by business
    const businessMetrics = new Map<string, {
      businessId: string;
      businessName: string;
      totalRevenue: number;
      totalEarnings: number;
      conversions: number;
      influencers: Set<string>;
    }>();

    // Get business names in batches
    const businessIds = new Set<string>();
    redemptionsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.businessId) businessIds.add(data.businessId);
    });

    const businessNames = new Map<string, string>();
    const businessIdsArray = Array.from(businessIds);
    for (let i = 0; i < businessIdsArray.length; i += 30) {
      const batch = businessIdsArray.slice(i, i + 30);
      const businessesSnapshot = await adminDb!.collection('businesses')
        .where('__name__', 'in', batch)
        .get();
      
      businessesSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        businessNames.set(doc.id, data.name || data.businessName || 'Unknown Business');
      });
    }

    // Process redemptions
    redemptionsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const businessId = data.businessId;
      if (!businessId) return;

      if (!businessMetrics.has(businessId)) {
        businessMetrics.set(businessId, {
          businessId,
          businessName: businessNames.get(businessId) || 'Unknown Business',
          totalRevenue: 0,
          totalEarnings: 0,
          conversions: 0,
          influencers: new Set()
        });
      }

      const metrics = businessMetrics.get(businessId)!;
      const amount = data.amountCents || 0;
      const splitPct = data.splitPct || 20;
      const earnings = Math.round(amount * (splitPct / 100));

      metrics.totalRevenue += amount;
      metrics.totalEarnings += earnings;
      metrics.conversions += 1;
      if (data.influencerId) {
        metrics.influencers.add(data.influencerId);
      }
    });

    // Convert to final format and sort
    const result = Array.from(businessMetrics.values())
      .map(m => ({
        businessId: m.businessId,
        businessName: m.businessName,
        totalRevenue: m.totalRevenue / 100,
        totalEarnings: m.totalEarnings / 100,
        conversions: m.conversions,
        uniqueInfluencers: m.influencers.size,
        averageOrderValue: m.conversions > 0 ? (m.totalRevenue / 100) / m.conversions : 0,
        conversionRate: m.influencers.size > 0 ? (m.conversions / m.influencers.size) * 100 : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    this.setCache(cacheKey, result);
    return result;
  }

  async getInfluencerPerformance(timeRange: AnalyticsTimeRange, limit: number = 20): Promise<InfluencerMetrics[]> {
    const cacheKey = this.getCacheKey('influencerPerformance', { timeRange, limit });
    const cached = this.getFromCache<InfluencerMetrics[]>(cacheKey);
    if (cached) return cached;

    if (!adminDb) throw new Error('Database not available');

    // Get redemptions in time range
    const redemptionsSnapshot = await adminDb!.collection('redemptions')
      .where('redeemedAt', '>=', timeRange.start)
      .where('redeemedAt', '<=', timeRange.end)
      .get();

    // Aggregate by influencer
    const influencerMetrics = new Map<string, {
      influencerId: string;
      totalEarnings: number;
      conversions: number;
      campaigns: Set<string>;
    }>();

    redemptionsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const influencerId = data.influencerId;
      if (!influencerId) return;

      if (!influencerMetrics.has(influencerId)) {
        influencerMetrics.set(influencerId, {
          influencerId,
          totalEarnings: 0,
          conversions: 0,
          campaigns: new Set()
        });
      }

      const metrics = influencerMetrics.get(influencerId)!;
      const amount = data.amountCents || 0;
      const splitPct = data.splitPct || 20;
      const earnings = Math.round(amount * (splitPct / 100));

      metrics.totalEarnings += earnings;
      metrics.conversions += 1;
      if (data.offerId) {
        metrics.campaigns.add(data.offerId);
      }
    });

    // Get influencer details
    const influencerIds = Array.from(influencerMetrics.keys());
    const influencerDetails = new Map<string, { name: string; tier: string }>();

    for (let i = 0; i < influencerIds.length; i += 30) {
      const batch = influencerIds.slice(i, i + 30);
      const influencersSnapshot = await adminDb!.collection('influencers')
        .where('__name__', 'in', batch)
        .get();
      
      influencersSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        influencerDetails.set(doc.id, {
          name: data.name || data.displayName || 'Unknown Influencer',
          tier: data.tier || 'S'
        });
      });
    }

    // Convert to final format and sort
    const result = Array.from(influencerMetrics.values())
      .map(m => {
        const details = influencerDetails.get(m.influencerId) || { name: 'Unknown', tier: 'S' };
        return {
          influencerId: m.influencerId,
          influencerName: details.name,
          tier: details.tier,
          totalEarnings: m.totalEarnings / 100,
          conversions: m.conversions,
          averageEarningsPerConversion: m.conversions > 0 ? (m.totalEarnings / 100) / m.conversions : 0,
          activeCampaigns: m.campaigns.size
        };
      })
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);

    this.setCache(cacheKey, result);
    return result;
  }

  async getCampaignPerformance(timeRange: AnalyticsTimeRange, businessId?: string): Promise<CampaignMetrics[]> {
    const cacheKey = this.getCacheKey('campaignPerformance', { timeRange, businessId });
    const cached = this.getFromCache<CampaignMetrics[]>(cacheKey);
    if (cached) return cached;

    if (!adminDb) throw new Error('Database not available');

    // Get redemptions in time range
    let redemptionsQuery = adminDb!.collection('redemptions')
      .where('redeemedAt', '>=', timeRange.start)
      .where('redeemedAt', '<=', timeRange.end);

    if (businessId) {
      redemptionsQuery = redemptionsQuery.where('businessId', '==', businessId);
    }

    const redemptionsSnapshot = await redemptionsQuery.get();

    // Aggregate by campaign
    const campaignMetrics = new Map<string, {
      campaignId: string;
      businessId: string;
      totalRevenue: number;
      totalEarnings: number;
      conversions: number;
      influencers: Set<string>;
      adSpend: number;
    }>();

    redemptionsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      const campaignId = data.offerId;
      if (!campaignId) return;

      if (!campaignMetrics.has(campaignId)) {
        campaignMetrics.set(campaignId, {
          campaignId,
          businessId: data.businessId || '',
          totalRevenue: 0,
          totalEarnings: 0,
          conversions: 0,
          influencers: new Set(),
          adSpend: 0
        });
      }

      const metrics = campaignMetrics.get(campaignId)!;
      const amount = data.amountCents || 0;
      const splitPct = data.splitPct || 20;
      const earnings = Math.round(amount * (splitPct / 100));

      metrics.totalRevenue += amount;
      metrics.totalEarnings += earnings;
      metrics.conversions += 1;
      if (data.influencerId) {
        metrics.influencers.add(data.influencerId);
      }
    });

    // Get campaign details
    const campaignIds = Array.from(campaignMetrics.keys());
    const campaignDetails = new Map<string, { name: string; budgetCents: number }>();

    for (let i = 0; i < campaignIds.length; i += 30) {
      const batch = campaignIds.slice(i, i + 30);
      const campaignsSnapshot = await adminDb!.collection('offers')
        .where('__name__', 'in', batch)
        .get();
      
      campaignsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        campaignDetails.set(doc.id, {
          name: data.title || 'Untitled Campaign',
          budgetCents: data.budgetCents || 0
        });
      });
    }

    // Convert to final format and sort
    const result = Array.from(campaignMetrics.values())
      .map(m => {
        const details = campaignDetails.get(m.campaignId) || { name: 'Unknown Campaign', budgetCents: 0 };
        const adSpend = details.budgetCents / 100;
        const roas = adSpend > 0 ? (m.totalRevenue / 100) / adSpend : 0;
        
        return {
          campaignId: m.campaignId,
          campaignName: details.name,
          businessId: m.businessId,
          totalRevenue: m.totalRevenue / 100,
          totalEarnings: m.totalEarnings / 100,
          conversions: m.conversions,
          uniqueInfluencers: m.influencers.size,
          conversionRate: m.influencers.size > 0 ? (m.conversions / m.influencers.size) * 100 : 0,
          roas: Math.round(roas * 100) / 100
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    this.setCache(cacheKey, result);
    return result;
  }

  async getTierDistribution(timeRange: AnalyticsTimeRange): Promise<{ tier: string; count: number; revenue: number; percentage: number }[]> {
    const cacheKey = this.getCacheKey('tierDistribution', { timeRange });
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    if (!adminDb) throw new Error('Database not available');

    // Get redemptions in time range
    const redemptionsSnapshot = await adminDb!.collection('redemptions')
      .where('redeemedAt', '>=', timeRange.start)
      .where('redeemedAt', '<=', timeRange.end)
      .get();

    // Get unique influencer IDs
    const influencerIds = new Set<string>();
    const influencerRevenue = new Map<string, number>();

    redemptionsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.influencerId) {
        influencerIds.add(data.influencerId);
        const current = influencerRevenue.get(data.influencerId) || 0;
        influencerRevenue.set(data.influencerId, current + (data.amountCents || 0));
      }
    });

    // Get influencer tiers
    const tierCounts = new Map<string, { count: number; revenue: number }>();
    const influencerIdsArray = Array.from(influencerIds);

    for (let i = 0; i < influencerIdsArray.length; i += 30) {
      const batch = influencerIdsArray.slice(i, i + 30);
      const influencersSnapshot = await adminDb!.collection('influencers')
        .where('__name__', 'in', batch)
        .get();

      influencersSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const tier = data.tier || 'S';
        const revenue = influencerRevenue.get(doc.id) || 0;

        if (!tierCounts.has(tier)) {
          tierCounts.set(tier, { count: 0, revenue: 0 });
        }

        const tierData = tierCounts.get(tier)!;
        tierData.count += 1;
        tierData.revenue += revenue;
      });
    }

    const totalInfluencers = influencerIds.size;
    const result = Array.from(tierCounts.entries()).map(([tier, data]) => ({
      tier,
      count: data.count,
      revenue: data.revenue / 100,
      percentage: totalInfluencers > 0 ? Math.round((data.count / totalInfluencers) * 100) : 0
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const analyticsAggregator = AnalyticsAggregator.getInstance();
