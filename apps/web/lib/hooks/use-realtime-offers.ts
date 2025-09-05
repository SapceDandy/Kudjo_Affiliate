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
  status: 'active' | 'paused' | 'ended';
  createdAt: Date;
  updatedAt?: Date;
  maxInfluencers?: number;
  currentInfluencers?: number;
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
      
      // Get offer document directly using bizId as document ID
      const businessId = user.uid;
      console.log('Setting up offers query for businessId:', businessId);
      const offerDocRef = doc(db, 'offers', businessId);

      // Set up real-time listener for single offer document
      unsubscribe = onSnapshot(
        offerDocRef,
        (snapshot: DocumentSnapshot) => {
          console.log('Real-time offers update - document exists:', snapshot.exists());
          const updatedOffers: BusinessOffer[] = [];
          
          if (snapshot.exists()) {
            const data = snapshot.data();
            updatedOffers.push({
              id: snapshot.id,
              title: data.title || 'Untitled Offer',
              description: data.description || '',
              discountType: data.discountType || 'percentage',
              splitPct: data.discountValue || 0,
              budgetCents: data.budgetCents || 0,
              eligibleTiers: data.eligibleTiers || [],
              active: data.active ?? true,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              activeInfluencers: data.activeInfluencers || 0,
              totalRedemptions: data.totalRedemptions || 0,
              totalRevenue: data.totalRevenue || 0
            });
          }

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
    createOffer
  };
}
