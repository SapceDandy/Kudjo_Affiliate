'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

interface SocialConnectResult {
  success: boolean;
  socialMediaData?: any;
  tierUpdate?: {
    previousTier: string;
    newTier: string;
    reason: string;
  };
}

export function useSocialConnect() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const connectInstagram = async (accessToken: string, userId: string): Promise<SocialConnectResult | null> => {
    if (!user?.uid) {
      toast.error('Authentication required');
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/influencer/connect-instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to connect Instagram');
      }

      const result: SocialConnectResult = await response.json();
      
      if (result.success) {
        toast.success('Instagram connected successfully!');
        if (result.tierUpdate) {
          toast.success(`Tier upgraded to ${result.tierUpdate.newTier.toUpperCase()}!`);
        }
      }

      return result;
    } catch (error) {
      console.error('Instagram connect error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Instagram');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const connectTikTok = async (accessToken: string, openId: string): Promise<SocialConnectResult | null> => {
    if (!user?.uid) {
      toast.error('Authentication required');
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/influencer/connect-tiktok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, openId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to connect TikTok');
      }

      const result: SocialConnectResult = await response.json();
      
      if (result.success) {
        toast.success('TikTok connected successfully!');
        if (result.tierUpdate) {
          toast.success(`Tier upgraded to ${result.tierUpdate.newTier.toUpperCase()}!`);
        }
      }

      return result;
    } catch (error) {
      console.error('TikTok connect error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect TikTok');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    connectInstagram,
    connectTikTok,
    loading,
  };
}
