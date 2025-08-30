'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function InfluencerSettingsPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFromDevice = async () => {
    if (!user) { setError('Please sign in'); return; }
    setBusy(true); setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      const { latitude, longitude } = pos.coords;
      await setDoc(doc(db, 'influencers', user.uid), { preferredGeo: { lat: latitude, lng: longitude } }, { merge: true });
      alert('Preferred location updated from device GPS');
    } catch (e) {
      setError('Unable to read device location');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Influencer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Set your preferred location based on your current device GPS. This helps us find offers near you. Manual entry is disabled for data integrity.</p>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button disabled={busy} onClick={setFromDevice}>{busy ? 'Updating...' : 'Use Current Device Location'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}


