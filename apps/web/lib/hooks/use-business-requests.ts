'use client';
import { useEffect, useState } from 'react';
import { useDemoAuth } from '@/lib/demo-auth';

interface BusinessRequest {
  id: string;
  influencer: string;
  followers: number;
  tier?: string;
  proposedSplitPct: number;
  discountType: string;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  createdAt: Date;
  status: 'pending' | 'countered' | 'approved' | 'declined';
}

export function useBusinessRequests() {
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const { user } = useDemoAuth();

  const fetchRequests = async (offset = 0, append = false) => {
    if (!user) {
      setError('Please sign in to view requests.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      if (!append) setLoading(true);
      
      const params = new URLSearchParams();
      params.set('businessId', user.uid);
      params.set('limit', '20');
      params.set('offset', offset.toString());
      
      const res = await fetch(`/api/business/requests?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch requests');
      }
      
      const data = await res.json();
      
      if (append) {
        setRequests(prev => [...prev, ...data.requests]);
      } else {
        setRequests(data.requests);
      }
      
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (err) {
      console.error('Error fetching business requests:', err);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (nextOffset !== null && !loading) {
      fetchRequests(nextOffset, true);
    }
  };

  const updateRequest = async (requestId: string, status: string, counterOffer?: any) => {
    const res = await fetch('/api/business/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        status,
        counterOffer
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update request');
    }

    // Update local state
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status: status as any } : req
    ));
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  return { 
    requests, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    updateRequest,
    refetch: () => fetchRequests()
  };
}
