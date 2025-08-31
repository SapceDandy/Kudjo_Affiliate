'use client';
import { useEffect, useState } from 'react';
import { useDemoAuth } from '@/lib/demo-auth';

interface BusinessOffer {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'expired';
  splitPct: number;
  discountType: string;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  createdAt: Date;
  description?: string;
  terms?: string;
}

export function useBusinessOffers() {
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const { user } = useDemoAuth();

  const fetchOffers = async (offset = 0, append = false) => {
    if (!user) {
      setError('Please sign in to view offers.');
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
      
      const res = await fetch(`/api/business/offers?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch offers');
      }
      
      const data = await res.json();
      
      if (append) {
        setOffers(prev => [...prev, ...data.offers]);
      } else {
        setOffers(data.offers);
      }
      
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (err) {
      console.error('Error fetching business offers:', err);
      setError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (nextOffset !== null && !loading) {
      fetchOffers(nextOffset, true);
    }
  };

  const createOffer = async (offerData: { businessId: string; title: string; discountType: string; splitPct: number; userDiscountPct?: number; userDiscountCents?: number; minSpendCents?: number; description?: string; terms?: string }) => {
    if (!user) throw new Error('Please sign in to create offers.');

    const res = await fetch('/api/business/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offerData)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to create offer');
    }

    const newOffer = await res.json();
    setOffers(prev => [newOffer, ...prev]);
    return newOffer;
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  return { 
    offers, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    createOffer,
    refetch: () => fetchOffers()
  };
}
