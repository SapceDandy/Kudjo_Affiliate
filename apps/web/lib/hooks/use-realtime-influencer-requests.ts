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
      setLoading(true);
      
      // Set up real-time Firestore listener
      const requestsRef = collection(db, 'influencerRequests');
      const q = query(
        requestsRef,
        where('influencerId', '==', user.uid),
        where('status', 'in', ['pending', 'countered', 'approved']), // Only show active requests
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Business Request',
            description: data.description,
            businessName: data.businessName || 'Unknown Business',
            businessId: data.businessId,
            splitPct: data.proposedSplitPct || 20,
            userDiscountPct: data.userDiscountPct,
            userDiscountCents: data.userDiscountCents,
            minSpendCents: data.minSpendCents,
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
            businessResponse: data.businessResponse
          } as InfluencerRequest;
        });

        setRequests(requestsData);
        setLoading(false);
      }, (error) => {
        console.error('❌ Firestore listener error:', error);
        setError('Failed to load requests. Please try again.');
        setLoading(false);
      });

    } catch (error: any) {
      console.error('❌ Error setting up requests listener:', error);
      setError('Failed to load requests. Please try again.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const fetchRequests = async () => {
    // Keep this for manual refresh, but it's not needed with real-time listeners
    if (!user) return;

    try {
      const response = await fetch(`/api/influencer/requests?infId=${user.uid}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.requests && Array.isArray(data.requests)) {
        const activeRequests = data.requests.filter((req: any) =>
          ['pending', 'accepted', 'counter', 'countered'].includes(req.status)
        );
        setRequests([...activeRequests]);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Error fetching influencer requests:', err);
      setError('Failed to load requests. Please try again.');
    }
  };

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
    respondToRequest,
    refetch: fetchRequests
  };
}
