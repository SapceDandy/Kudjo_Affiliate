'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { toast } from 'react-hot-toast';

interface InfluencerRequest {
  id: string;
  title: string;
  description?: string;
  businessName: string;
  businessId: string;
  splitPct: number;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  status: 'pending' | 'countered' | 'approved' | 'declined' | 'closed';
  createdAt: Date;
  updatedAt?: Date;
  businessResponse?: string;
}

export function useRealtimeInfluencerRequests() {
  const [requests, setRequests] = useState<InfluencerRequest[]>([]);
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
      
      // Create real-time query for influencer requests
      const requestsRef = collection(db, 'influencerRequests');
      const requestsQuery = query(
        requestsRef,
        where('infId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      // Set up real-time listener
      unsubscribe = onSnapshot(
        requestsQuery,
        (snapshot) => {
          const updatedRequests: InfluencerRequest[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            updatedRequests.push({
              id: doc.id,
              title: data.title || 'Business Request',
              description: data.description,
              businessName: data.businessName || 'Unknown Business',
              businessId: data.bizId,
              splitPct: data.proposedSplitPct || 20,
              userDiscountPct: data.userDiscountPct,
              userDiscountCents: data.userDiscountCents,
              minSpendCents: data.minSpendCents,
              status: data.status || 'pending',
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.(),
              businessResponse: data.businessResponse
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
          console.error('Error in real-time influencer requests listener:', err);
          setError('Failed to load requests. Please try again.');
          setLoading(false);
        }
      );

    } catch (err) {
      console.error('Error setting up real-time influencer requests listener:', err);
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

  const respondToRequest = async (requestId: string, action: 'accept' | 'decline' | 'counter', counterOffer?: any) => {
    try {
      const res = await fetch('/api/influencer/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          counterOffer
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.error || 'Failed to respond to request';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Show success toast - real-time listener will update UI automatically
      const actionMessages = {
        accept: 'Request accepted successfully',
        decline: 'Request declined successfully',
        counter: 'Counter offer sent successfully'
      };
      toast.success(actionMessages[action] || 'Request updated successfully');
    } catch (error) {
      console.error('Error responding to request:', error);
      throw error;
    }
  };

  return { 
    requests, 
    loading, 
    error, 
    respondToRequest
  };
}
