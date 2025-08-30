'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

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
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view offers.');
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        // Create mock data directly to bypass Firebase quota issues
        const mockOffers: Offer[] = [
          {
            id: 'mock_1',
            title: 'Buy One Get One Free Fitness',
            description: 'Order any entree and get a second one free',
            splitPct: 25,
            userDiscountPct: 50,
            businessName: 'Sunset Grill',
            businessId: 'demo_biz_1',
            status: 'active' as const,
            currentInfluencers: 2,
            maxInfluencers: 10
          },
          {
            id: 'mock_2',
            title: '30% Off Mexican Orders',
            description: '30% discount on all Mexican food orders',
            splitPct: 22,
            userDiscountPct: 30,
            businessName: 'Spirits & More',
            businessId: 'demo_biz_1',
            status: 'active' as const,
            currentInfluencers: 5,
            maxInfluencers: 15
          },
          {
            id: 'mock_3',
            title: '$10 Off Your Order',
            description: 'Get $10 off when you spend $30 or more',
            splitPct: 20,
            userDiscountCents: 1000,
            minSpend: 3000,
            businessName: 'Copper Kettle',
            businessId: 'demo_biz_1',
            status: 'active' as const,
            currentInfluencers: 1,
            maxInfluencers: 8
          },
          {
            id: 'mock_4',
            title: 'Student Discount - 15% Off Sports Bar',
            description: '15% off for students with valid ID',
            splitPct: 18,
            userDiscountPct: 15,
            businessName: 'Modern Bistro',
            businessId: 'demo_biz_1',
            status: 'active' as const,
            currentInfluencers: 3,
            maxInfluencers: 12
          },
          {
            id: 'mock_5',
            title: 'Happy Hour - 30% Off Drinks & Apps',
            description: '30% off drinks and appetizers during happy hour',
            splitPct: 26,
            userDiscountPct: 30,
            businessName: 'Classic Style',
            businessId: 'demo_biz_1',
            status: 'active' as const,
            currentInfluencers: 4,
            maxInfluencers: 20
          },
          {
            id: 'mock_6',
            title: 'Free Appetizer with Entree Purchase',
            description: 'Get a free appetizer when you order any entree',
            splitPct: 24,
            userDiscountCents: 800,
            minSpend: 1500,
            businessName: 'Local Bistro',
            businessId: 'demo_biz_1',
            status: 'active' as const,
            currentInfluencers: 2,
            maxInfluencers: 6
          }
        ];

        const batch = mockOffers.slice(offset, offset + 20);
        setOffers(prev => offset === 0 ? batch : [...prev, ...batch]);
        setHasMore(offset + 20 < mockOffers.length);
        setError(null);
        return;

        // Fallback to client Firestore if server route unavailable
        const offersRef = collection(db, 'offers');
        const offersQuery = query(offersRef, where('active', '==', true));
        const offersSnapshot = await getDocs(offersQuery);

        // Get business details for each offer
        const offersWithDetails = await Promise.all(
          offersSnapshot.docs.map(async (offerDoc) => {
            try {
              const offerData = offerDoc.data();
              const bizRef = doc(db, 'businesses', offerData.bizId);
              const bizDoc = await getDoc(bizRef);
              const bizData = bizDoc.data();

              if (!bizData) return null;

              const offer: Offer = {
                id: offerDoc.id,
                title: offerData.title || '',
                description: offerData.description || '',
                splitPct: offerData.splitPct || 0,
                businessName: bizData.name || '',
                businessId: offerData.bizId,
                status: offerData.status || 'active',
                minSpend: offerData.minSpend,
                maxInfluencers: offerData.maxInfluencers,
                currentInfluencers: offerData.currentInfluencers || 0,
                expiresAt: offerData.expiresAt,
              };
              
              return offer;
            } catch (err) {
              console.error('Error processing offer:', err);
              return null;
            }
          })
        );

        // Filter out null values and sort
        const validOffers: Offer[] = offersWithDetails.filter((offer): offer is Offer => offer !== null);
        validOffers.sort((a, b) => {
          // Sort active offers first, then by title
          if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
          }
          return a.title.localeCompare(b.title);
        });

        setOffers(validOffers);
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