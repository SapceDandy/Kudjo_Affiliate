'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';

interface BusinessRequest {
  id: string;
  influencer: string;
  followers: number;
  tier?: string;
  proposedSplitPct: number;
  discountType: string;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  createdAt: Date;
  status: 'pending' | 'countered' | 'approved' | 'declined' | 'closed';
  discountAmount?: number;
  commissionSplit?: number;
  updatedAt?: Date;
}

export function useRealtimeRequests() {
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view requests.');
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;

    try {
      setError(null);
      
      // Create real-time query for business requests
      const requestsRef = collection(db, 'influencerRequests');
      const requestsQuery = query(
        requestsRef,
        where('bizId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      // Set up real-time listener
      unsubscribe = onSnapshot(
        requestsQuery,
        (snapshot) => {
          const updatedRequests: BusinessRequest[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            updatedRequests.push({
              id: doc.id,
              influencer: data.influencerName || `Influencer ${data.infId?.slice(-4) || 'Unknown'}`,
              followers: data.followers || 0,
              tier: data.tier || 'Small',
              proposedSplitPct: data.proposedSplitPct || 20,
              discountType: data.discountType || 'percentage',
              userDiscountPct: data.userDiscountPct,
              userDiscountCents: data.userDiscountCents,
              minSpendCents: data.minSpendCents,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              status: data.status || 'pending',
              discountAmount: data.discountAmount,
              commissionSplit: data.commissionSplit,
              updatedAt: data.updatedAt?.toDate?.()
            });
          });

          // Filter out closed/declined requests for UI display
          const activeRequests = updatedRequests.filter(req => 
            req.status !== 'closed' && req.status !== 'declined'
          );

          setRequests(activeRequests);
          setLoading(false);
        },
        (err) => {
          console.error('Error in real-time requests listener:', err);
          setError('Failed to load requests. Please try again.');
          setLoading(false);
        }
      );

    } catch (err) {
      console.error('Error setting up real-time requests listener:', err);
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

  const updateRequest = async (requestId: string, status: string, counterOffer?: any) => {
    try {
      const res = await fetch('/api/business/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status,
          counterOffer
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || 'Failed to update request';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Show success toast - real-time listener will update UI automatically
      const statusMessages = {
        closed: 'Request closed successfully',
        approved: 'Request approved successfully',
        declined: 'Request declined successfully',
        countered: 'Counter offer sent successfully'
      };
      toast.success(statusMessages[status as keyof typeof statusMessages] || 'Request updated successfully');
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  };

  const updateOfferTerms = async (requestId: string, discountAmount: number, commissionSplit: number) => {
    try {
      const res = await fetch(`/api/business/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountAmount,
          commissionSplit
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update offer');
      }

      // Real-time listener will update UI automatically
      return true;
    } catch (error) {
      console.error('Error updating offer terms:', error);
      throw error;
    }
  };

  return { 
    requests, 
    loading, 
    error, 
    updateRequest,
    updateOfferTerms
  };
}
