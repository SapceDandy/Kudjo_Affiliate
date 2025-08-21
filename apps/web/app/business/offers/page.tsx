'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateOfferDialog } from './create-offer-dialog';
import { EditOfferDialog } from './edit-offer-dialog';
import { useOffers } from '@/lib/hooks/use-offers';
import { Eye, Edit, Play, Pause, Users } from 'lucide-react';

export default function OffersPage() {
  const { offers, loading, error } = useOffers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<string | null>(null);

  const handleStatusToggle = async (offerId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const res = await fetch('/api/offer/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update offer status');
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error updating offer status:', error);
      alert('Failed to update offer status');
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading offers: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Your Offers</h1>
          <p className="text-gray-600">Manage your influencer marketing campaigns</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create New Offer</Button>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first offer to start working with influencers
            </p>
            <Button onClick={() => setCreateOpen(true)}>Create Your First Offer</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{offer.title}</CardTitle>
                  <Badge variant={offer.status === 'active' ? 'default' : 'secondary'}>
                    {offer.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">{offer.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Split: {offer.splitPct}%</span>
                    {offer.minSpend && (
                      <span className="text-gray-500">Min: ${offer.minSpend}</span>
                    )}
                  </div>

                  {offer.maxInfluencers && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{offer.currentInfluencers || 0}/{offer.maxInfluencers} influencers</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOffer(offer.id)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={offer.status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleStatusToggle(offer.id, offer.status)}
                      className="flex-1"
                    >
                      {offer.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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