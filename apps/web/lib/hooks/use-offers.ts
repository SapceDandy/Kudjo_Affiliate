'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDemoAuth } from '@/lib/demo-auth';

interface Offer {
  id: string;
  title: string;
  description: string;
  splitPct: number;
  businessName: string;
  businessId: string;
  status: 'active' | 'pending' | 'ended';
  minSpend?: number;
  maxInfluencers?: number;
  currentInfluencers?: number;
  expiresAt?: string;
}

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { user } = useDemoAuth();

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view offers.');
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        const params = new URLSearchParams();
        params.set('limit', '20');
        params.set('offset', String(offset));
        const res = await fetch(`/api/offers/list?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load offers');
        const js = await res.json();
        const items = (js.items || []) as any[];

        const mapped = items.map((o) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          splitPct: o.splitPct,
          businessName: o.businessName,
          businessId: o.bizId,
          status: (o.status || 'active') as 'active' | 'pending' | 'ended',
          minSpend: o.minSpend,
          maxInfluencers: o.maxInfluencers,
          currentInfluencers: o.currentInfluencers,
          expiresAt: o.expiresAt,
          // passthrough discount fields if present
          ...(typeof o.userDiscountPct === 'number' ? { userDiscountPct: o.userDiscountPct } : {}),
          ...(typeof o.userDiscountCents === 'number' ? { userDiscountCents: o.userDiscountCents } : {}),
        })) as Offer[];

        setOffers(prev => offset === 0 ? mapped : [...prev, ...mapped]);
        setHasMore(Boolean((js as any).nextOffset));
        setError(null);
      } catch (err) {
        console.error('Error fetching offers:', err);
        setError('Failed to load campaigns. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [user, offset]);

  return { offers, loading, error, hasMore, loadMore: () => setOffset(prev => prev + 20) };
} 