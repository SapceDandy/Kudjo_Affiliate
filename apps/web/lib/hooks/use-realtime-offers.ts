'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe, doc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';

interface BusinessOffer {
  id: string;
  title: string;
  description?: string;
  splitPct: number;
  discountType: string;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  budgetCents?: number;
  status: 'active' | 'paused' | 'ended';
  createdAt: Date;
  updatedAt?: Date;
  maxInfluencers?: number;
  currentInfluencers?: number;
  eligibleTiers?: string[];
  active?: boolean;
  activeInfluencers?: number;
  totalRedemptions?: number;
  totalRevenue?: number;
}

export function useRealtimeOffers() {
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view offers.');
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;

    try {
      setError(null);
      
      // Query all offers for this business using bizId field
      const businessId = user.uid;
      console.log('Setting up offers query for businessId:', businessId);
      const offersRef = collection(db, 'offers');
      const offersQuery = query(offersRef, where('businessId', '==', businessId));

      // Set up real-time listener for offers collection
      unsubscribe = onSnapshot(
        offersQuery,
        (snapshot) => {
          console.log('Real-time offers update - found docs:', snapshot.docs.length);
          const updatedOffers: BusinessOffer[] = [];
          
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            console.log('Offer doc data:', data);
            updatedOffers.push({
              id: doc.id,
              title: data.title || 'Untitled Offer',
              description: data.description || '',
              discountType: data.discountType || 'percentage',
              splitPct: data.discountValue || 0,
              budgetCents: data.budgetCents || 0,
              eligibleTiers: data.eligibleTiers || [],
              active: data.active ?? true,
              status: data.status || 'active',
              createdAt: data.createdAt?.toDate?.() || new Date(),
              activeInfluencers: data.activeInfluencers || 0,
              totalRedemptions: data.totalRedemptions || 0,
              totalRevenue: data.totalRevenue || 0
            });
          });

          console.log('Setting offers:', updatedOffers.length);
          setOffers(updatedOffers);
          setLoading(false);
        },
        (err) => {
          console.error('Error in real-time offers listener:', err);
          setError('Failed to load offers. Please try again.');
          setLoading(false);
        }
      );

    } catch (err) {
      console.error('Error setting up real-time offers listener:', err);
      setError('Failed to set up real-time updates.');
      setLoading(false);
    }

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const pauseOffer = async (offerId: string) => {
    try {
      const res = await fetch(`/api/business/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to pause offer');
      }

      toast.success('Offer paused successfully');
    } catch (error) {
      console.error('Error pausing offer:', error);
      toast.error('Failed to pause offer');
      throw error;
    }
  };

  const resumeOffer = async (offerId: string) => {
    try {
      const res = await fetch(`/api/business/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resume offer');
      }

      toast.success('Offer resumed successfully');
    } catch (error) {
      console.error('Error resuming offer:', error);
      toast.error('Failed to resume offer');
      throw error;
    }
  };

  const endOffer = async (offerId: string) => {
    try {
      const res = await fetch(`/api/business/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to end offer');
      }

      toast.success('Offer ended successfully');
    } catch (error) {
      console.error('Error ending offer:', error);
      toast.error('Failed to end offer');
      throw error;
    }
  };

  const createOffer = async (offerData: any) => {
    try {
      const res = await fetch('/api/business/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...offerData,
          businessId: user?.uid
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create offer');
      }

      toast.success('Offer created successfully');
      return true;
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Failed to create offer');
      throw error;
    }
  };

  return { 
    offers, 
    loading, 
    error, 
    pauseOffer,
    resumeOffer,
    endOffer,
    createOffer
  };
}
