'use client';

import { useEffect, useState } from 'react';

export interface RequestItem {
  id: string;
  bizId: string;
  title: string;
  description?: string;
  splitPct?: number;
  contentMealCapCents?: number;
  status: 'open' | 'closed';
  createdAt: string;
}

export function useRequests(status: 'open' | 'closed' = 'open') {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/requests/list?status=${status}`);
        if (!res.ok) throw new Error('Failed');
        const js = await res.json();
        setItems(js.items || []);
      } catch (e) {
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [status]);

  return { items, loading, error };
}


