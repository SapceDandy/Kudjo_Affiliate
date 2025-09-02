'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AvailableCampaignsResponse } from '@/lib/schemas/coupon';

interface UseAvailableCampaignsResult {
  campaigns: AvailableCampaignsResponse['campaigns'];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  hasMore: boolean;
  loadMore: () => void;
  search: (query: string) => void;
  filter: (filters: CampaignFilters) => void;
  clearFilters: () => void;
}

interface CampaignFilters {
  businessName?: string;
  minSplitPct?: number;
  maxSplitPct?: number;
  discountType?: 'percentage' | 'fixed';
}

export function useAvailableCampaigns(): UseAvailableCampaignsResult {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<AvailableCampaignsResponse['campaigns']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CampaignFilters>({});

  const fetchCampaigns = async (pageNum: number = 1, reset: boolean = false) => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        infId: user.uid,
        page: pageNum.toString(),
        limit: '20',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (filters.businessName) {
        params.append('businessName', filters.businessName);
      }

      if (filters.minSplitPct) {
        params.append('minSplitPct', filters.minSplitPct.toString());
      }

      if (filters.maxSplitPct) {
        params.append('maxSplitPct', filters.maxSplitPct.toString());
      }

      if (filters.discountType) {
        params.append('discountType', filters.discountType);
      }

      const response = await fetch(`/api/influencer/available-campaigns?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch campaigns');
      }

      const data: AvailableCampaignsResponse = await response.json();
      
      if (reset) {
        setCampaigns(data.campaigns);
      } else {
        setCampaigns(prev => [...prev, ...data.campaigns]);
      }
      
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching available campaigns:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    setPage(1);
    fetchCampaigns(1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchCampaigns(page + 1, false);
    }
  };

  const search = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    // Trigger refetch with new search
    setTimeout(() => fetchCampaigns(1, true), 0);
  };

  const filter = (newFilters: CampaignFilters) => {
    setFilters(newFilters);
    setPage(1);
    // Trigger refetch with new filters
    setTimeout(() => fetchCampaigns(1, true), 0);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({});
    setPage(1);
    // Trigger refetch without filters
    setTimeout(() => fetchCampaigns(1, true), 0);
  };

  useEffect(() => {
    if (user?.uid) {
      fetchCampaigns(1, true);
    }
  }, [user?.uid, searchQuery, filters]);

  return {
    campaigns,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
    search,
    filter,
    clearFilters,
  };
}
