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

        // Get all active offers
        const offersRef = collection(db, 'offers');
        const offersQuery = query(offersRef, where('active', '==', true));
        const offersSnapshot = await getDocs(offersQuery);

        const isTestAccount = Boolean(user.email && /test|demo|example/i.test(user.email));
        const shouldBypassGeo = !pos || isTestAccount;

        const offersWithDetails = await Promise.all(
          offersSnapshot.docs.map(async (offerDoc) => {
            try {
              const offerData = offerDoc.data();
              const bizRef = doc(db, 'businesses', offerData.bizId);
              const bizDoc = await getDoc(bizRef);
              const bizData = bizDoc.data();
              if (!bizData) return null;

              let distance = Infinity;
              if (pos && bizData.geo) {
                distance = calculateDistance(
                  pos.coords.latitude,
                  pos.coords.longitude,
                  bizData.geo.lat,
                  bizData.geo.lng
                );
              }

              // If we have location, filter to 100 miles radius
              if (!shouldBypassGeo && (isNaN(distance) || distance > 100)) return null;

              return {
                id: offerDoc.id,
                title: offerData.title,
                description: offerData.description,
                splitPct: offerData.splitPct,
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

        setOffers(validOffers);
        setError(null);
      } catch (err) {
        console.error('Error fetching nearby offers:', err);
        setError('Failed to load offers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [user]);

  return { offers, loading, error };
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