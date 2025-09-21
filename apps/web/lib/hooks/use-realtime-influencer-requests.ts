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

    
    const fetchRequests = async () => {
      try {
        setError(null);
        setLoading(true);
        
        const response = await fetch(`/api/influencer/requests?infId=${user.uid}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API error response:', response.status, errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.requests) {
          
          // Filter to show only active requests (pending, accepted, counter)
          const activeRequests = data.requests.filter((req: any) =>
            ['pending', 'accepted', 'counter', 'countered'].includes(req.status)
          );
          
          setRequests(activeRequests);
        } else {
          setRequests([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching influencer requests:', err);
        setError('Failed to load requests. Please try again.');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchRequests();
    
    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchRequests, 30000);
    
    return () => {
      clearInterval(interval);
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
