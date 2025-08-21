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
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view offers.');
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        // Get all active offers
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
  }, [user]);

  return { offers, loading, error };
} 