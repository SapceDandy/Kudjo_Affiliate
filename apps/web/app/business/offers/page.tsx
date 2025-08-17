'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateOfferDialog } from './create-offer-dialog';
import { EditOfferDialog } from './edit-offer-dialog';
import { useOffers } from '@/lib/hooks/use-offers';

export default function OffersPage() {
  const { offers, loading, error } = useOffers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<string | null>(null);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading offers: {error}</div>;
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <Button onClick={() => setCreateOpen(true)}>Create Offer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
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
                <p className="text-sm">Status: {offer.status}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOffer(offer.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant={offer.status === 'active' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={async () => {
                      await fetch(`/api/offer.update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          offerId: offer.id,
                          status: offer.status === 'active' ? 'paused' : 'active',
                        }),
                      });
                      // Refresh offers
                      window.location.reload();
                    }}
                  >
                    {offer.status === 'active' ? 'Pause' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateOfferDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editOffer && (
        <EditOfferDialog
          offerId={editOffer}
          open={true}
          onClose={() => setEditOffer(null)}
        />
      )}
    </div>
  );
} 