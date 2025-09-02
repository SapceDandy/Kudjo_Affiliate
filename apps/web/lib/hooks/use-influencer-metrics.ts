'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

interface InfluencerMetrics {
  totalEarnings: number; // cents
  weeklyEarnings: number; // cents
  activeCampaigns: number;
  totalRedemptions: number;
  conversionRate: number; // percentage
  partnerBusinesses: number;
  pendingRequests: number;
  tier: string;
  followers: number;
}

export function useInfluencerMetrics() {
  const [metrics, setMetrics] = useState<InfluencerMetrics | null>(null);
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
        params.set('influencerId', user.uid);
        const res = await fetch(`/api/influencer/metrics?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching influencer metrics:', err);
        setError('Failed to load metrics. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  return { metrics, loading, error };
}
