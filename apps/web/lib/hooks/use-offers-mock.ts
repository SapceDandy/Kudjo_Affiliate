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
  status: 'active' | 'pending' | 'ended';
  maxInfluencers?: number;
  currentInfluencers?: number;
  expiresAt?: string;
}

function getInfluencerTier(followers: number): { tier: string; splitMultiplier: number; mealAllowance: number } {
  if (followers >= 100000) return { tier: 'Extra Large', splitMultiplier: 1.5, mealAllowance: 100 }; // $100 meal
  if (followers >= 50000) return { tier: 'Large', splitMultiplier: 1.3, mealAllowance: 75 }; // $75 meal  
  if (followers >= 20000) return { tier: 'Medium', splitMultiplier: 1.1, mealAllowance: 50 }; // $50 meal
  return { tier: 'Small', splitMultiplier: 1.0, mealAllowance: 25 }; // $25 meal
}

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { user } = useDemoAuth();
  
  // Mock influencer data - in real app this would come from user profile
  const mockInfluencerFollowers = 15000; // Demo influencer has 15k followers
  const tierInfo = getInfluencerTier(mockInfluencerFollowers);

  const mockOffers: Offer[] = [
    {
      id: 'mock_1',
      title: 'Buy One Get One Free Fitness',
      description: `Order any entree and get a second one free (${tierInfo.tier} Tier: $${tierInfo.mealAllowance} meal allowance)`,
      splitPct: Math.round(25 * tierInfo.splitMultiplier),
      userDiscountPct: 50,
      businessName: 'Sunset Grill',
      businessId: 'demo_biz_1',
      status: 'active',
      currentInfluencers: 2,
      maxInfluencers: 10
    },
    {
      id: 'mock_2',
      title: '30% Off Mexican Orders',
      description: '30% discount on all Mexican food orders',
      splitPct: Math.round(22 * tierInfo.splitMultiplier),
      userDiscountPct: 30,
      businessName: 'Spirits & More',
      businessId: 'demo_biz_1',
      status: 'active',
      currentInfluencers: 5,
      maxInfluencers: 15
    },
    {
      id: 'mock_3',
      title: '$10 Off Your Order',
      description: `Get $10 off when you spend $30 or more (${tierInfo.tier} Tier: $${tierInfo.mealAllowance} meal allowance)`,
      splitPct: Math.round(20 * tierInfo.splitMultiplier),
      userDiscountCents: 1000,
      minSpend: 3000,
      businessName: 'Copper Kettle',
      businessId: 'demo_biz_1',
      status: 'active',
      currentInfluencers: 1,
      maxInfluencers: 8
    },
    {
      id: 'mock_4',
      title: 'Student Discount - 15% Off Sports Bar',
      description: `15% off for students with valid ID (${tierInfo.tier} Tier: $${tierInfo.mealAllowance} meal allowance)`,
      splitPct: Math.round(18 * tierInfo.splitMultiplier),
      userDiscountPct: 15,
      businessName: 'Modern Bistro',
      businessId: 'demo_biz_1',
      status: 'active',
      currentInfluencers: 3,
      maxInfluencers: 12
    },
    {
      id: 'mock_5',
      title: 'Happy Hour - 30% Off Drinks & Apps',
      description: `30% off drinks and appetizers during happy hour (${tierInfo.tier} Tier: $${tierInfo.mealAllowance} meal allowance)`,
      splitPct: Math.round(26 * tierInfo.splitMultiplier),
      userDiscountPct: 30,
      businessName: 'Classic Style',
      businessId: 'demo_biz_1',
      status: 'active',
      currentInfluencers: 4,
      maxInfluencers: 20
    },
    {
      id: 'mock_6',
      title: 'Free Appetizer with Entree Purchase',
      description: `Get a free appetizer when you order any entree (${tierInfo.tier} Tier: $${tierInfo.mealAllowance} meal allowance)`,
      splitPct: Math.round(24 * tierInfo.splitMultiplier),
      userDiscountCents: 800,
      minSpend: 1500,
      businessName: 'Local Bistro',
      businessId: 'demo_biz_1',
      status: 'active',
      currentInfluencers: 2,
      maxInfluencers: 6
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
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const batch = mockOffers.slice(offset, offset + 20);
        setOffers(prev => offset === 0 ? batch : [...prev, ...batch]);
        setHasMore(offset + 20 < mockOffers.length);
      } catch (err) {
        console.error('Error fetching offers:', err);
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
