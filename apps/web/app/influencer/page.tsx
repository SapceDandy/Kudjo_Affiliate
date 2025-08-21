'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loading } from '@/components/ui/loading';
import { MapPin, DollarSign, Clock, Users } from 'lucide-react';
import { useNearbyOffers } from '@/lib/hooks/use-nearby-offers';
import { useOffers } from '@/lib/hooks/use-offers';
import { ClaimOfferDialog } from './claim-offer-dialog';

interface Campaign {
  id: string;
  title: string;
  description?: string;
  splitPct: number;
  minSpend?: number;
  businessName: string;
  businessId: string;
  distance?: number;
  status: 'active' | 'pending' | 'ended';
  expiresAt?: string;
  maxInfluencers?: number;
  currentInfluencers?: number;
}

export default function InfluencerPage() {
  const { offers: nearbyOffers, loading: nearbyLoading, error: nearbyError } = useNearbyOffers();
  const { offers: allOffers, loading: allLoading, error: allError } = useOffers();
  const [claimOffer, setClaimOffer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('nearby');

  const handleClaimCampaign = (offerId: string) => {
    setClaimOffer(offerId);
  };

  const CampaignCard = ({ campaign, showDistance = false }: { campaign: Campaign; showDistance?: boolean }) => (
    <Card key={campaign.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{campaign.title}</CardTitle>
          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{campaign.description}</p>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-medium">{campaign.splitPct}% split</span>
            </div>
            {campaign.minSpend && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Min: ${campaign.minSpend}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{campaign.businessName}</span>
            </div>
            {showDistance && campaign.distance && (
              <span className="text-muted-foreground">{campaign.distance.toFixed(1)} mi</span>
            )}
          </div>

          {campaign.maxInfluencers && (
            <div className="flex items-center gap-1 text-sm">
              <Users className="w-4 h-4 text-purple-600" />
              <span>{campaign.currentInfluencers || 0}/{campaign.maxInfluencers} influencers</span>
            </div>
          )}

          {campaign.expiresAt && (
            <div className="flex items-center gap-1 text-sm text-orange-600">
              <Clock className="w-4 h-4" />
              <span>Expires {new Date(campaign.expiresAt).toLocaleDateString()}</span>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <Button
              className="w-full"
              onClick={() => handleClaimCampaign(campaign.id)}
              disabled={campaign.status !== 'active' || (campaign.maxInfluencers ? (campaign.currentInfluencers || 0) >= campaign.maxInfluencers : false)}
            >
              {campaign.status !== 'active' ? 'Campaign Ended' : 
               (campaign.maxInfluencers && (campaign.currentInfluencers || 0) >= campaign.maxInfluencers) ? 'Campaign Full' :
               'Start Campaign'}
            </Button>
            <p className="text-xs text-muted-foreground">
              You'll receive both an affiliate link and a content coupon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Available Campaigns</h1>
          <p className="text-muted-foreground">Browse and claim campaigns from local businesses</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nearby">Nearby Offers</TabsTrigger>
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="nearby" className="space-y-6">
          {nearbyLoading ? (
            <Loading message="Finding nearby offers..." />
          ) : nearbyError ? (
            <div className="text-center py-12">
              <p className="text-red-500">{nearbyError}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : nearbyOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No offers available in your area yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try checking "All Campaigns" or enable location access
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyOffers.map((offer: any) => (
                <CampaignCard
                  key={offer.id}
                  campaign={{
                    ...offer,
                    businessId: offer.bizId || offer.businessId,
                    status: 'active'
                  }}
                  showDistance={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          {allLoading ? (
            <Loading message="Loading all campaigns..." />
          ) : allError ? (
            <div className="text-center py-12">
              <p className="text-red-500">{allError}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : allOffers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No campaigns available at the moment.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for new opportunities
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allOffers.map((offer: any) => (
                <CampaignCard
                  key={offer.id}
                  campaign={{
                    ...offer,
                    businessId: offer.bizId || offer.businessId,
                    status: offer.status || 'active'
                  }}
                  showDistance={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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