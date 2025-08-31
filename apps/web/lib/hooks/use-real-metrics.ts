'use client';

import { useState, useEffect } from 'react';

interface GlobalMetrics {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenueCents: number;
  generatedAt: string;
  isMockData: boolean;
}

interface InfluencerMetrics {
  totalEarnings: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pendingPayout: number;
  redemptions: number;
  conversionRate: number;
}

interface BusinessMetrics {
  totalPayoutOwed: number;
  totalRedemptions: number;
  activeOffers: number;
  pendingRequests: number;
  totalRevenue: number;
  avgOrderValue: number;
  topInfluencers: Array<{
    name: string;
    redemptions: number;
    payout: number;
  }>;
}

export function useGlobalMetrics() {
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch('/api/control-center/metrics');
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  return { metrics, loading, error, refetch: () => fetchMetrics() };
}

export function useInfluencerMetrics(infId?: string) {
  const [metrics, setMetrics] = useState<InfluencerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!infId) return;

    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch(`/api/influencer/metrics?infId=${infId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch influencer metrics');
        }
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [infId]);

  return { metrics, loading, error };
}

export function useBusinessMetrics(businessId?: string) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;

    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch(`/api/business/metrics?businessId=${businessId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch business metrics');
        }
        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [businessId]);

  return { metrics, loading, error };
}

export function useRedemptionHistory(entityId?: string, entityType?: 'influencer' | 'business') {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId || !entityType) return;

    async function fetchRedemptions() {
      try {
        setLoading(true);
        const endpoint = entityType === 'influencer' 
          ? `/api/influencer/redemptions?infId=${entityId}`
          : `/api/business/redemptions?businessId=${entityId}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to fetch redemption history');
        }
        const data = await response.json();
        setRedemptions(data.redemptions || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchRedemptions();
  }, [entityId, entityType]);

  return { redemptions, loading, error };
}
