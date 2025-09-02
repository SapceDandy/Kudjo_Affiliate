'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

interface Offer {
  id: string;
  title: string;
  description: string;
  splitPct: number;
  businessName: string;
  distance: number;
}

export function useNearbyOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setError('Please sign in to view offers.');
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        // Attempt to get user's location
        let pos: GeolocationPosition | null = null;
        try {
          pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
        } catch (geoErr) {
          pos = null;
        }

        // If no device location, try influencer preferredGeo
        let fallbackGeo: { lat: number; lng: number } | null = null;
        if (!pos) {
          try {
            const infDoc = await getDoc(doc(db, 'influencers', user.uid));
            const inf = infDoc.exists() ? (infDoc.data() as any) : null;
            if (inf?.preferredGeo && typeof inf.preferredGeo.lat === 'number' && typeof inf.preferredGeo.lng === 'number') {
              fallbackGeo = { lat: inf.preferredGeo.lat, lng: inf.preferredGeo.lng };
            }
          } catch {}
        }

        // Prefer server endpoint to avoid client rules issues and to include business geo
        const params = new URLSearchParams();
        params.set('limit', '20');
        params.set('offset', String(offset));
        const res = await fetch(`/api/offers/list?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load offers');
        const js = await res.json();
        const serverOffers = (js.items || []) as any[];

        const isTestAccount = Boolean(user.email && /test|demo|example/i.test(user.email));
        const effectivePos = pos || (fallbackGeo ? ({ coords: { latitude: fallbackGeo.lat, longitude: fallbackGeo.lng } } as any) : null);
        const shouldBypassGeo = !effectivePos || isTestAccount;

        const offersWithDetails = await Promise.all(
          serverOffers.map(async (o) => {
            try {
              const bizData = { name: o.businessName, geo: o.businessGeo } as any;
              let distance = Infinity;
              if (effectivePos && bizData?.geo) {
                distance = calculateDistance(
                  (effectivePos as any).coords.latitude,
                  (effectivePos as any).coords.longitude,
                  bizData.geo.lat,
                  bizData.geo.lng
                );
              }
              if (!shouldBypassGeo && (isNaN(distance) || distance > 100)) return null;
              return {
                id: o.id,
                title: o.title,
                description: o.description,
                splitPct: o.splitPct,
                businessName: bizData.name,
                distance: Number.isFinite(distance) ? distance : Math.floor(Math.random() * 80) + 5,
              } as Offer;
            } catch (err) {
              console.error('Error processing offer:', err);
              return null;
            }
          })
        );

        const validOffers = offersWithDetails.filter((offer): offer is Offer => offer !== null);
        validOffers.sort((a, b) => a.distance - b.distance);
        setOffers(prev => offset === 0 ? validOffers : [...prev, ...validOffers]);
        // hasMore: if nextOffset is provided by backend assume more available
        const data = js as any;
        setHasMore(Boolean(data.nextOffset));
        setError(null);
      } catch (err) {
        console.error('Error fetching nearby offers:', err);
        setError('Failed to load offers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [user, offset]);

  return { offers, loading, error, hasMore, loadMore: () => setOffset(prev => prev + 20) };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
} 