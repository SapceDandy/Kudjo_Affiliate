'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/logger';

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
  exclusive?: boolean;
}

export function useRealtimeOffers() {
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const transformFirestoreOffer = (doc: any): BusinessOffer => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || 'Untitled Offer',
      description: data.description || '',
      discountType: data.discountType || 'percentage',
      splitPct: data.splitPct || 0,
      userDiscountPct: data.userDiscountPct,
      userDiscountCents: data.userDiscountCents,
      minSpendCents: data.minSpendCents,
      budgetCents: data.budgetCents || 0,
      status: data.status || 'active',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
      maxInfluencers: data.maxInfluencers,
      currentInfluencers: data.currentInfluencers || 0,
      eligibleTiers: data.eligibleTiers || [],
      active: data.status === 'active',
      activeInfluencers: data.activeInfluencers || 0,
      totalRedemptions: data.totalRedemptions || 0,
      totalRevenue: data.totalRevenue || 0,
      exclusive: data.exclusive || false
    };
  };

  // No longer needed - using real-time onSnapshot instead of polling

  useEffect(() => {
    if (!user) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time Firestore listener
    const q = query(
      collection(db, 'offers'),
      where('businessId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transformedOffers = snapshot.docs.map(transformFirestoreOffer);
        setOffers(transformedOffers);
        setLoading(false);
        setError(null);
      },
      (error) => {
        logger.error('Error in realtime offers listener', error);
        setError('Failed to load offers. Please try again.');
        setLoading(false);
      }
    );

    // Clean up listener on unmount
    return () => unsubscribe();
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

      // Update local state immediately for better UX
      setOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'paused' as const } : offer
      ));
      
      toast.success('Offer paused successfully');
    } catch (error) {
      logger.error('Error pausing offer', error);
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

      // Update local state immediately for better UX
      setOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'active' as const } : offer
      ));
      
      toast.success('Offer resumed successfully');
    } catch (error) {
      logger.error('Error resuming offer', error);
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

      // Remove ended offers from local state immediately
      setOffers(prev => prev.filter(offer => offer.id !== offerId));
      
      toast.success('Offer ended successfully');
    } catch (error) {
      logger.error('Error ending offer', error);
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

      const newOffer = await res.json();
      
      // Add new offer to local state immediately
      if (newOffer.offer) {
        const transformedOffer: BusinessOffer = {
          id: newOffer.offer.id,
          title: newOffer.offer.title || 'Untitled Offer',
          description: newOffer.offer.description || '',
          discountType: newOffer.offer.discountType || 'percentage',
          splitPct: newOffer.offer.splitPct || 0,
          userDiscountPct: newOffer.offer.userDiscountPct,
          userDiscountCents: newOffer.offer.userDiscountCents,
          minSpendCents: newOffer.offer.minSpendCents,
          budgetCents: newOffer.offer.budgetCents || 0,
          status: newOffer.offer.status || 'active',
          createdAt: new Date(newOffer.offer.createdAt),
          updatedAt: newOffer.offer.updatedAt ? new Date(newOffer.offer.updatedAt) : undefined,
          maxInfluencers: newOffer.offer.maxInfluencers,
          currentInfluencers: newOffer.offer.currentInfluencers || 0,
          eligibleTiers: newOffer.offer.eligibleTiers || [],
          active: newOffer.offer.status === 'active',
          activeInfluencers: newOffer.offer.activeInfluencers || 0,
          totalRedemptions: newOffer.offer.totalRedemptions || 0,
          totalRevenue: newOffer.offer.totalRevenue || 0,
          exclusive: newOffer.offer.exclusive || false
        };
        
        setOffers(prev => [transformedOffer, ...prev]);
      }
      
      toast.success('Offer created successfully');
      return true;
    } catch (error) {
      logger.error('Error creating offer', error);
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
    // Note: refetch is no longer needed with real-time listeners
  };
}
