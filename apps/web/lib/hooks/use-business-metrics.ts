'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

interface BusinessMetrics {
  totalPayoutOwed: number; // cents
  totalRedemptions: number;
  activeOffers: number;
  pendingRequests: number;
  totalRevenue: number; // cents
  avgOrderValue: number; // cents
  topInfluencers: Array<{
    name: string;
    redemptions: number;
    payout: number; // cents
  }>;
}

export function useBusinessMetrics() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view metrics.');
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setError(null);
        const params = new URLSearchParams();
        params.set('businessId', user.uid);
        const res = await fetch(`/api/business/metrics?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching business metrics:', err);
        setError('Failed to load metrics. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  return { metrics, loading, error };
}
