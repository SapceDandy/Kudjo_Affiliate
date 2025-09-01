'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface OnboardingData {
  name: string;
  address: string;
  defaultSplitPct: number;
  posProvider: 'square' | 'manual' | 'clover';
}

interface PosSetupFormProps {
  onNext: (data?: Partial<OnboardingData>) => void;
  initialData: OnboardingData;
}

export function PosSetupForm({ onNext, initialData }: PosSetupFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSquareConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_SQUARE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/business/onboard/square-callback`;
    const scope = encodeURIComponent('PAYMENTS_READ ORDERS_READ ITEMS_READ');
    window.location.href = `https://connect.squareup.com/oauth2/authorize?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}`;
  };

  const handleManualEnable = async () => {
    try {
      setLoading(true);
      // Get businessId from demo auth context
      const demoUser = JSON.parse(localStorage.getItem('demo-user') || '{}');
      const businessId = demoUser.uid || 'demo_business_user';
      
      const res = await fetch('/api/business/pos/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider: 'manual',
          businessId 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to enable manual mode' }));
        throw new Error(errorData.error || 'Failed to enable manual mode');
      }
      
      onNext(); // No data needed for final step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up manual mode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialData.posProvider === 'square') {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold">Connect Square Account</h2>
        <p className="text-sm text-muted-foreground">
          Click below to connect your Square account. You'll be redirected to Square to authorize access.
        </p>
        <Button
          className="w-full"
          onClick={handleSquareConnect}
          disabled={loading}
        >
          Connect Square Account
        </Button>
      </div>
    );
  }

  if (initialData.posProvider === 'manual') {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold">Set Up Manual Mode</h2>
        <p className="text-sm text-muted-foreground">
          In manual mode, your staff will enter redemption codes at checkout. We'll reconcile transactions nightly.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          className="w-full"
          onClick={handleManualEnable}
          disabled={loading}
        >
          Enable Manual Mode
        </Button>
      </div>
    );
  }

  // Clover (not available in MVP)
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-lg font-semibold">Clover Integration</h2>
      <p className="text-sm text-muted-foreground">
        Clover integration is not available in the MVP. Please select Square or Manual Mode.
      </p>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => window.history.back()}
      >
        Go Back
      </Button>
    </div>
  );
} 