import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

interface Offer {
  id: string;
  title: string;
  description?: string;
  splitPct: number;
  minSpend?: number;
  status: 'active' | 'paused' | 'ended';
  startAt: string;
  endAt?: string;
}

export function useOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'offers'),
      where('bizId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const offers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Offer[];
        setOffers(offers);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching offers:', err);
        setError('Failed to load offers');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { offers, loading, error };
} 