import { useState, useEffect } from 'react';
import { useDemoAuth } from '@/lib/demo-auth';

interface Offer {
  id: string;
  title: string;
  description: string;
  splitPct: number;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpend?: number;
  businessName: string;
  businessId: string;
  distance: number;
}

export function useNearbyOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { user } = useDemoAuth();

  const mockNearbyOffers: Offer[] = [
    {
      id: 'nearby_1',
      title: 'Buy One Get One Free Fitness',
      description: 'Order any entree and get a second one free',
      splitPct: 25,
      userDiscountPct: 50,
      businessName: 'Sunset Grill',
      businessId: 'demo_biz_1',
      distance: 17.1
    },
    {
      id: 'nearby_2', 
      title: '46% Off Chicken',
      description: 'Great deal on Chicken at Spirits & More',
      splitPct: 31,
      userDiscountPct: 46,
      businessName: 'Spirits & More',
      businessId: 'demo_biz_2',
      distance: 19.3
    },
    {
      id: 'nearby_3',
      title: 'First Time Customer Deal',
      description: 'Great deal on Sports Bar at Copper Kettle',
      splitPct: 26,
      userDiscountPct: 28,
      businessName: 'Copper Kettle',
      businessId: 'demo_biz_3',
      distance: 72.2
    }
  ];

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view offers.');
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        setError(null);
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const batch = mockNearbyOffers.slice(offset, offset + 20);
        setOffers(prev => offset === 0 ? batch : [...prev, ...batch]);
        setHasMore(offset + 20 < mockNearbyOffers.length);
      } catch (err) {
        console.error('Error fetching nearby offers:', err);
        setError('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [user, offset]);

  const loadMore = () => {
    setOffset(prev => prev + 20);
  };

  return { offers, loading, error, hasMore, loadMore };
}
