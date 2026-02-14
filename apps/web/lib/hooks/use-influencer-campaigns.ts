'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

interface Campaign {
  id: string;
  offerId: string;
  businessName: string;
  offerTitle: string;
  splitPct: number;
  status: 'active' | 'completed' | 'expired' | 'pending' | 'declined' | 'available';
  affiliateLink?: {
    url: string;
    qrUrl: string;
  };
  contentCoupon?: {
    code: string;
    qrUrl: string;
    used: boolean;
  };
  earnings: number;
  createdAt: string;
  deadline?: string;
  campaignId: string;
  linkId?: string;
  linkStatus?: string;
  description?: string;
  eligibilityTags?: string[];
}

export function useInfluencerCampaigns(tab: 'invited' | 'open' = 'invited') {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCampaigns = async () => {
    if (!user?.uid) {
      setError('Please sign in to view campaigns.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const params = new URLSearchParams();
      params.set('influencerId', user.uid);
      params.set('tab', tab);
      
      const res = await fetch(`/api/influencer/campaigns?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Error fetching influencer campaigns:', err);
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const acceptCampaign = async (campaignId: string) => {
    if (!user?.uid) return;

    try {
      const res = await fetch(`/api/influencer/campaigns/${campaignId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId: user.uid })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to accept campaign');
      }

      // Refresh campaigns after accepting
      await fetchCampaigns();
      return await res.json();
    } catch (err) {
      console.error('Error accepting campaign:', err);
      throw err;
    }
  };

  const declineCampaign = async (campaignId: string) => {
    if (!user?.uid) return;

    try {
      const res = await fetch(`/api/influencer/campaigns/${campaignId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId: user.uid })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to decline campaign');
      }

      // Refresh campaigns after declining
      await fetchCampaigns();
      return await res.json();
    } catch (err) {
      console.error('Error declining campaign:', err);
      throw err;
    }
  };

  const requestPayout = async (linkIds: string[], method: string = 'bank_transfer') => {
    if (!user?.uid) return;

    try {
      const res = await fetch('/api/influencer/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencerId: user.uid,
          linkIds,
          method
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to request payout');
      }

      return await res.json();
    } catch (err) {
      console.error('Error requesting payout:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user, tab]);

  return { 
    campaigns, 
    loading, 
    error, 
    refetch: fetchCampaigns,
    acceptCampaign,
    declineCampaign,
    requestPayout
  };
}
