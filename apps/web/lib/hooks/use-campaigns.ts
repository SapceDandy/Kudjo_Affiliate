'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit as qlimit, startAfter, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export interface Campaign {
  id: string;
  offerId: string;
  bizId: string;
  infId: string;
  affiliateCouponId?: string;
  affiliateCode?: string;
  contentCouponId?: string;
  contentCode?: string;
  status: 'active' | 'awaiting_content' | 'submitted' | 'completed';
  createdAt: string;
  contentUsedAt?: string;
  postDueAt?: string; // 7 days after contentUsedAt
  submittedAt?: string;
  removeAllowedAt?: string; // e.g., 30 days after submittedAt
}

export function useCampaigns(pageSize: number = 20) {
  const { user } = useAuth();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<any>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setError('Please sign in');
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const base = collection(db, 'campaigns');
        let q = query(base, where('infId', '==', user.uid), orderBy('createdAt', 'desc'), qlimit(pageSize));
        if (cursor) {
          q = query(base, where('infId', '==', user.uid), orderBy('createdAt', 'desc'), startAfter(cursor), qlimit(pageSize));
        }
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Campaign[];
        setItems(prev => cursor ? [...prev, ...docs] : docs);
        setHasMore(docs.length === pageSize);
        setCursor(snap.docs[snap.docs.length - 1] || null);
      } catch (e) {
        console.error('Error fetching campaigns:', e);
        setError('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { items, loading, error, hasMore };
}


