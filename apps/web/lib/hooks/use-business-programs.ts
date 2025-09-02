'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

interface BusinessProgram {
  id: string;
  influencer: string;
  offerTitle: string;
  redemptions: number;
  payoutCents: number;
  since: Date;
  infId: string;
  offerId: string;
}

export function useBusinessPrograms() {
  const [programs, setPrograms] = useState<BusinessProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const { user } = useAuth();

  const fetchPrograms = async (offset = 0, append = false) => {
    if (!user) {
      setError('Please sign in to view programs.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      if (!append) setLoading(true);
      
      const params = new URLSearchParams();
      params.set('businessId', user.uid);
      params.set('limit', '100'); // Preload up to 100 items
      params.set('offset', offset.toString());
      
      const res = await fetch(`/api/business/programs?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch programs');
      }
      
      const data = await res.json();
      
      if (append) {
        setPrograms(prev => [...prev, ...data.programs]);
      } else {
        setPrograms(data.programs);
      }
      
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (err) {
      console.error('Error fetching business programs:', err);
      setError('Failed to load programs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (nextOffset !== null && !loading) {
      fetchPrograms(nextOffset, true);
    }
  };

  const processPayout = async (programIds: string[]) => {
    if (!user) throw new Error('Please sign in to process payouts.');

    const res = await fetch('/api/business/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: user.uid,
        programIds,
        action: 'payout'
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to process payout');
    }

    return await res.json();
  };

  useEffect(() => {
    fetchPrograms();
  }, [user]);

  return { 
    programs, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    processPayout,
    refetch: () => fetchPrograms()
  };
}
