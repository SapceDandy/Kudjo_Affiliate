'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useNearbyOffers } from '@/lib/hooks/use-nearby-offers';
import { ClaimOfferDialog } from './claim-offer-dialog';

interface NearbyOffer {
  id: string;
  title: string;
  description?: string;
  splitPct: number;
  minSpend?: number;
  businessName: string;
  distance: number;
}

export default function InfluencerPage() {
  const { offers, loading, error } = useNearbyOffers();
  const [claimOffer, setClaimOffer] = useState<string | null>(null);

  if (loading) {
    return <Loading message="Finding nearby offers..." />;
  }

  if (error) {
    return (
      <div className="container py-8 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Nearby Offers</h1>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No offers available in your area yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer: NearbyOffer) => (
            <Card key={offer.id}>
              <CardHeader>
                <CardTitle>{offer.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{offer.description}</p>
                  <p className="text-sm">Split: {offer.splitPct}%</p>
                  {offer.minSpend && (
                    <p className="text-sm">Min Spend: ${offer.minSpend}</p>
                  )}
                  <p className="text-sm">Business: {offer.businessName}</p>
                  <p className="text-sm">Distance: {offer.distance.toFixed(1)} miles</p>
                  <Button
                    className="w-full"
                    onClick={() => setClaimOffer(offer.id)}
                  >
                    Claim Content Coupon
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {claimOffer && (
        <ClaimOfferDialog
          offerId={claimOffer}
          open={true}
          onClose={() => setClaimOffer(null)}
        />
      )}
    </div>
  );
} 