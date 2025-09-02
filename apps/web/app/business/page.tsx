"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { useBusinessOffers } from '@/lib/hooks/use-business-offers';
import { CreateOfferDialog } from '@/components/business/create-offer-dialog';
import { MessageCenter } from '@/components/messaging/message-center';
import { FindInfluencersDialog } from '@/components/find-influencers-dialog';
import { 
  DollarSign, 
  MessageSquare, 
  Store,
  Percent,
  MapPin,
  Users,
  Clock
} from 'lucide-react';

type DiscountType = 'percentage' | 'dollar' | 'bogo' | 'student' | 'happy_hour' | 'free_appetizer' | 'first_time';

export default function BusinessHome() {
  const user = { uid: 'demo_business_user' };
  const { offers: realOffers, loading: offersLoading, createOffer, refetch: refetchOffers } = useBusinessOffers();
  
  const metrics = { totalPayoutOwed: 0, totalRedemptions: 0, activeOffers: 0 };
  const realRequests: any[] = [];
  const realPrograms: any[] = [];
  
  const [offersSearch, setOffersSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [messageCenterOpen, setMessageCenterOpen] = useState(false);

  const filteredOffers = realOffers?.filter((offer: any) => 
    offer.title?.toLowerCase().includes(offersSearch.toLowerCase())
  ) || [];

  const totalPayoutCents = metrics?.totalPayoutOwed || 0;
  const totalRedemptions = metrics?.totalRedemptions || 0;
  const activeOffers = metrics?.activeOffers || 0;

  const formatMoney = (cents?: number) => typeof cents === 'number' ? `$${(cents/100).toFixed(2)}` : '$0.00';

  return (
    <>
      <div className="space-y-6">
        {/* Header + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Store className="w-5 h-5" /> Business Dashboard
            </h1>
            <p className="text-muted-foreground">Manage offers, influencer requests, and programs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFindDialogOpen(true)}>Find Influencers</Button>
            <Button variant="outline" onClick={() => setTierDialogOpen(true)}>Tier Defaults</Button>
            <Button variant="outline" onClick={() => setMessageCenterOpen(true)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Offer</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Payout Owed</p>
                  <p className="text-xl font-bold text-green-600">{formatMoney(totalPayoutCents)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Redemptions</p>
                  <p className="text-xl font-bold text-blue-600">{totalRedemptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Offers</p>
                  <p className="text-xl font-bold text-purple-600">{activeOffers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-xl font-bold text-orange-600">{realRequests.filter((r: any) => r.status === 'pending').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Offers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Offers</h2>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Search offers..."
              value={offersSearch}
              onChange={(e) => setOffersSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          {offersLoading ? (
            <div className="text-center py-8">Loading offers...</div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No offers found.</p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                Create Your First Offer
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffers.map((o: any) => (
                <Card key={o.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{o.title}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-blue-600" /> Austin, TX
                        </p>
                      </div>
                      <Badge variant={o.status === 'active' ? 'default' : 'outline'}>{o.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Influencer Split</p>
                        <p className="font-semibold text-green-600">{o.splitPct}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Customer Discount</p>
                        <p className="font-semibold text-blue-600">
                          {o.discountType === 'percentage' && `${o.userDiscountPct}% off`}
                          {o.discountType === 'dollar' && `${formatMoney(o.userDiscountCents)} off`}
                          {o.discountType === 'bogo' && 'BOGO'}
                          {o.discountType === 'student' && 'Student'}
                          {o.discountType === 'happy_hour' && 'Happy Hour'}
                          {o.discountType === 'free_appetizer' && 'Free Appetizer'}
                          {o.discountType === 'first_time' && 'First-Time Customer'}
                        </p>
                        {o.minSpendCents ? (
                          <p className="text-xs text-muted-foreground">Min spend {formatMoney(o.minSpendCents)}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          const nextStatus = o.status === 'active' ? 'paused' : 'active';
                          try {
                            await fetch(`/api/business/offers/${o.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ status: nextStatus }),
                            });
                            toast.success(`Offer ${nextStatus === 'active' ? 'resumed' : 'paused'}`);
                            refetchOffers();
                          } catch (error) {
                            console.error('Error updating offer:', error);
                            toast.error('Failed to update offer');
                          }
                        }}
                      >
                        {o.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                      <Button variant="outline" size="sm">View Performance</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateOfferDialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        onOfferCreated={refetchOffers}
      />

      {findDialogOpen && (
        <FindInfluencersDialog 
          open={findDialogOpen} 
          onClose={() => setFindDialogOpen(false)}
          onSendRequest={async (req) => {
            try {
              const response = await fetch('/api/business/requests', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  businessId: user?.uid || 'demo_business_user',
                  influencer: req.influencer,
                  followers: req.followers,
                  tier: req.tier,
                  proposedSplitPct: req.proposedSplitPct,
                  discountType: req.discountType,
                  userDiscountPct: req.userDiscountPct,
                  userDiscountCents: req.userDiscountCents,
                  minSpendCents: req.minSpendCents,
                  offerId: req.offerId,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 409 && errorData.code === 'DUPLICATE_REQUEST') {
                  throw new Error(errorData.error);
                }
                throw new Error(`Failed to send request: ${response.statusText}`);
              }

              const result = await response.json();
            } catch (error) {
              console.error('Error sending request:', error);
              throw error;
            }
          }}
        />
      )}

      {tierDialogOpen && (
        <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tier Defaults</DialogTitle>
              <DialogDescription>
                Configure default settings for influencer tiers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Configure default split percentages and minimum requirements for each influencer tier.
              </p>
              
              <div className="grid gap-4">
                {[
                  { tier: 'S', name: 'Silver', followers: '1K-10K', defaultSplit: 15 },
                  { tier: 'M', name: 'Gold', followers: '10K-50K', defaultSplit: 20 },
                  { tier: 'L', name: 'Platinum', followers: '50K-100K', defaultSplit: 25 },
                  { tier: 'XL', name: 'Diamond', followers: '100K-500K', defaultSplit: 30 },
                  { tier: 'Huge', name: 'Celebrity', followers: '500K+', defaultSplit: 35 }
                ].map((tierInfo) => (
                  <div key={tierInfo.tier} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tierInfo.name} ({tierInfo.tier})</h4>
                      <p className="text-sm text-muted-foreground">{tierInfo.followers} followers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Default Split:</span>
                      <input 
                        type="number" 
                        defaultValue={tierInfo.defaultSplit}
                        className="w-16 px-2 py-1 border rounded text-center"
                        min="5"
                        max="50"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    toast.success('Tier defaults updated successfully!');
                    setTierDialogOpen(false);
                  }} 
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button onClick={() => setTierDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Message Center */}
      <MessageCenter
        open={messageCenterOpen}
        onClose={() => setMessageCenterOpen(false)}
        userId={user.uid}
        userType="business"
        userName="Demo Business"
      />
    </>
  );
}
