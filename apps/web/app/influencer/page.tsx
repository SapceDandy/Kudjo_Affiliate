'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loading } from '@/components/ui/loading';
import { MapPin, DollarSign, Clock, Users } from 'lucide-react';
import { useNearbyOffers } from '@/lib/hooks/use-nearby-offers-mock';
import { useOffers } from '@/lib/hooks/use-offers-mock';
import { useCampaigns } from '@/lib/hooks/use-campaigns';
import { useRequests } from '@/lib/hooks/use-requests';
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

function CampaignCard({ campaign, showDistance = false, onStart }: { 
  campaign: Campaign; 
  showDistance?: boolean; 
  onStart: (offerId: string) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
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
          
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm">You earn: {campaign.splitPct}% split</span>
            </div>
            <div className="text-sm">
              <span className="text-blue-600 font-medium">
                Customer gets: {
                  typeof (campaign as any).userDiscountPct === 'number' 
                    ? `${(campaign as any).userDiscountPct}% off`
                    : typeof (campaign as any).userDiscountCents === 'number'
                    ? `$${((campaign as any).userDiscountCents / 100).toFixed(0)} off`
                    : '20% off'
                }
              </span>
              {campaign.minSpend && (
                <span className="text-muted-foreground ml-2">
                  (Min: ${typeof campaign.minSpend === 'number' ? (campaign.minSpend / 100).toFixed(0) : campaign.minSpend})
                </span>
              )}
            </div>
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
              onClick={() => onStart(campaign.id)}
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
}

export default function InfluencerPage() {
  const { offers: nearbyOffers, loading: nearbyLoading, error: nearbyError, hasMore: nearbyHasMore, loadMore: nearbyLoadMore } = useNearbyOffers();
  const { offers: allOffers, loading: allLoading, error: allError, hasMore: allHasMore, loadMore: allLoadMore } = useOffers();
  // Mock campaigns data
  const campaigns = [
    { id: 'prog_1', offerId: 'demo_offer_1', bizId: 'Demo Bistro' }
  ];
  
  // Mock requests data  
  const requests = [
    { 
      id: 'req_1', 
      title: 'Weekend Brunch Partnership',
      description: 'Looking for food influencers to promote our weekend brunch specials',
      splitPct: 25,
      userDiscountPct: 20,
      bizId: 'Local Cafe',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'pending',
      businessResponse: null
    },
    { 
      id: 'req_2', 
      title: 'Summer BBQ Campaign',
      description: 'Partner with us for our summer BBQ menu promotion',
      splitPct: 30,
      userDiscountPct: 25,
      bizId: 'BBQ House',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'counter_offered',
      businessResponse: 'We can offer 28% split instead of 30%'
    }
  ];
  const reqLoading = false;
  const [negotiatingRequest, setNegotiatingRequest] = useState<string | null>(null);
  const [claimOffer, setClaimOffer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('nearby');
  const [viewingCampaign, setViewingCampaign] = useState<string | null>(null);
  const [mainView, setMainView] = useState<'dashboard' | 'deals'>('dashboard');

  const getTimeAgo = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const handleClaimCampaign = (offerId: string) => {
    setClaimOffer(offerId);
  };

  return (
    <div className="container py-8">
      {/* Main Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {mainView === 'dashboard' ? 'Influencer Dashboard' : 'Available Campaigns'}
          </h1>
          <p className="text-muted-foreground">
            {mainView === 'dashboard' 
              ? 'Manage your active campaigns and requests' 
              : 'Browse and claim campaigns from local businesses'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={mainView === 'deals' ? 'default' : 'outline'}
            onClick={() => setMainView('deals')}
          >
            Browse Deals
          </Button>
        </div>
      </div>

      {mainView === 'deals' ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="nearby">Nearby Offers</TabsTrigger>
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="my">My Programs</TabsTrigger>
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
                  onStart={handleClaimCampaign}
                />
              ))}
            </div>
          )}
          {nearbyHasMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={nearbyLoadMore}>Load more</Button>
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
                  onStart={handleClaimCampaign}
                />
              ))}
            </div>
          )}
          {allHasMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={allLoadMore}>Load more</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Business Requests</h3>
              <p className="text-sm text-muted-foreground">{requests.length} total requests</p>
            </div>
          </div>
          
          {reqLoading ? (
            <div className="text-center py-12">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No requests at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((r) => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{r.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{getTimeAgo(r.createdAt)}</p>
                        {r.status === 'counter_offered' && (
                          <Badge variant="secondary" className="mt-1">Response</Badge>
                        )}
                        {r.status === 'pending' && (
                          <Badge variant="outline" className="mt-1">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-green-600">Your Split:</span>
                        <span className="font-bold">{r.splitPct}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-blue-600">Customer Gets:</span>
                        <span className="font-bold">{r.userDiscountPct}% off</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{r.bizId}</span>
                      </div>

                      {r.businessResponse && (
                        <div className="bg-blue-50 border border-blue-200 p-2 rounded text-sm">
                          <p className="font-medium text-blue-800">Business Response:</p>
                          <p className="text-blue-700">{r.businessResponse}</p>
                        </div>
                      )}

                      <div className="pt-2 space-y-2">
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1" 
                            onClick={() => {
                              alert(`Request accepted! Campaign will begin shortly.\n\nTerms:\n- Split: ${r.splitPct}%\n- Customer discount: ${r.userDiscountPct}%\n- Business: ${r.bizId}`);
                            }}
                          >
                            Accept
                          </Button>
                          <Button 
                            className="flex-1" 
                            variant="outline"
                            onClick={() => setNegotiatingRequest(r.id)}
                          >
                            Negotiate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Review terms and respond to business
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You have no active programs yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((c) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">Active Program</CardTitle>
                      <Badge variant="default">In Progress</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Track your deadlines and progress</p>
                      
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{c.bizId}</span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Content Creation:</span>
                          <span className="text-orange-600">5 days left</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Post Submission:</span>
                          <span className="text-green-600">Completed</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Post Removal:</span>
                          <span className="text-blue-600">23 days left</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button 
                          className="w-full" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setViewingCampaign(c.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      ) : (
        /* Dashboard View */
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-xl font-bold text-green-600">$248.50</p>
                    <p className="text-xs text-muted-foreground">+$12.30 this week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Campaigns</p>
                    <p className="text-xl font-bold text-blue-600">{campaigns.length}</p>
                    <p className="text-xs text-muted-foreground">1 ending soon</p>
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
                    <p className="text-xl font-bold text-orange-600">{requests.length}</p>
                    <p className="text-xs text-muted-foreground">1 needs response</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tier Status</p>
                    <p className="text-xl font-bold text-purple-600">Small</p>
                    <p className="text-xs text-muted-foreground">15k followers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">47</p>
                  <p className="text-sm text-muted-foreground">Total Redemptions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">23%</p>
                  <p className="text-sm text-muted-foreground">Avg Conversion Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">8</p>
                  <p className="text-sm text-muted-foreground">Partner Businesses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Campaigns */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Active Campaigns</h2>
              <Button 
                variant="outline" 
                onClick={() => setMainView('deals')}
              >
                Browse New Deals
              </Button>
            </div>
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No active campaigns yet.</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setMainView('deals')}
                  >
                    Browse Available Deals
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => (
                  <Card key={c.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{c.bizId}</h3>
                              <p className="text-sm text-muted-foreground">Campaign #{c.offerId}</p>
                            </div>
                            <Badge>Active</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Earnings</p>
                              <p className="text-lg font-bold text-green-600">$48.50</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Redemptions</p>
                              <p className="text-lg font-bold text-blue-600">12</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Content Due</p>
                              <p className="text-lg font-bold text-orange-600">5 days</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Post Removal</p>
                              <p className="text-lg font-bold text-purple-600">23 days</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setViewingCampaign(c.id)}
                            >
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                            >
                              Share Campaign
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                            >
                              Submit Content
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent Requests */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Requests ({requests.length})</h2>
            {requests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No requests at this time.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.slice(0, 2).map((r) => (
                  <Card key={r.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{r.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{r.bizId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{getTimeAgo(r.createdAt)}</p>
                          {r.status === 'counter_offered' && (
                            <Badge variant="secondary" className="mt-1">Response</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Split:</span>
                          <span className="font-bold text-green-600">{r.splitPct}%</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1">Accept</Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setNegotiatingRequest(r.id)}
                          >
                            Negotiate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {requests.length > 2 && (
              <div className="text-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setMainView('deals');
                    setActiveTab('requests');
                  }}
                >
                  View All Requests
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {claimOffer && (
        <ClaimOfferDialog
          offerId={claimOffer}
          open={true}
          onClose={() => setClaimOffer(null)}
        />
      )}

      {negotiatingRequest && (
        <NegotiationDialog
          requestId={negotiatingRequest}
          open={true}
          onClose={() => setNegotiatingRequest(null)}
        />
      )}

      {viewingCampaign && (
        <CampaignDetailsDialog
          campaignId={viewingCampaign}
          open={true}
          onClose={() => setViewingCampaign(null)}
        />
      )}
    </div>
  );
}

function NegotiationDialog({ requestId, open, onClose }: { requestId: string; open: boolean; onClose: () => void }) {
  const [splitPct, setSplitPct] = useState(25);
  const [discountType, setDiscountType] = useState('percentage');
  const [userDiscountPct, setUserDiscountPct] = useState(20);
  const [userDiscountCents, setUserDiscountCents] = useState(500);
  const [minSpend, setMinSpend] = useState(0);
  const [message, setMessage] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Negotiate Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Your Split Percentage</label>
            <input
              type="number"
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 border rounded-md"
              min="10"
              max="50"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Discount Type</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              <option value="percentage">Percentage Off</option>
              <option value="dollar">Dollar Off</option>
              <option value="bogo">Buy One Get One Free</option>
              <option value="student">Student Discount</option>
              <option value="happy_hour">Happy Hour</option>
              <option value="free_appetizer">Free Appetizer</option>
              <option value="first_time">First-Time Customer</option>
            </select>
          </div>
          
          {discountType === 'percentage' && (
            <div>
              <label className="text-sm font-medium">Customer Discount %</label>
              <input
                type="number"
                value={userDiscountPct}
                onChange={(e) => setUserDiscountPct(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min="5"
                max="50"
              />
            </div>
          )}
          
          {discountType === 'dollar' && (
            <div>
              <label className="text-sm font-medium">Dollar Amount Off ($)</label>
              <input
                type="number"
                value={userDiscountCents / 100}
                onChange={(e) => setUserDiscountCents(Number(e.target.value) * 100)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min="1"
                step="0.01"
              />
            </div>
          )}
          
          {(discountType === 'dollar' || discountType === 'free_appetizer') && (
            <div>
              <label className="text-sm font-medium">Minimum Spend ($)</label>
              <input
                type="number"
                value={minSpend / 100}
                onChange={(e) => setMinSpend(Number(e.target.value) * 100)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min="0"
                step="0.01"
              />
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium">Message to Business</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Explain your counter-proposal..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const discountText = discountType === 'percentage' 
                  ? `${userDiscountPct}% off`
                  : discountType === 'dollar'
                  ? `$${userDiscountCents / 100} off`
                  : discountType === 'bogo'
                  ? 'Buy One Get One Free'
                  : `${discountType.replace('_', ' ')} discount`;
                  
                alert(`Negotiation sent!\n\nYour terms:\n- Split: ${splitPct}%\n- Customer gets: ${discountText}\n- Min spend: $${minSpend / 100}\n- Message: ${message}`);
                onClose();
              }}
              className="flex-1"
            >
              Send Counter-Offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CampaignDetailsDialog({ campaignId, open, onClose }: { campaignId: string; open: boolean; onClose: () => void }) {
  // Mock campaign details
  const campaignDetails = {
    id: campaignId,
    business: 'Demo Bistro',
    offer: 'Weekend Brunch Special',
    status: 'Active',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    contentDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    postRemovalDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now
    splitPct: 25,
    userDiscountPct: 20,
    totalRedemptions: 12,
    earnings: 48.50,
    affiliateLink: 'https://kudjo.app/r/ABC123XYZ',
    contentCoupon: 'MEAL8X2K9P'
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysLeft = (date: Date) => {
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campaign Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Campaign Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-lg">{campaignDetails.business}</h3>
              <p className="text-muted-foreground">{campaignDetails.offer}</p>
              <Badge className="mt-2">{campaignDetails.status}</Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Started {formatDate(campaignDetails.startDate)}</p>
              <p className="text-2xl font-bold text-green-600">${campaignDetails.earnings}</p>
              <p className="text-sm text-muted-foreground">{campaignDetails.totalRedemptions} redemptions</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Timeline & Requirements</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Content Creation Deadline:</span>
                <span className="text-sm font-medium text-orange-600">
                  {getDaysLeft(campaignDetails.contentDeadline)} days left ({formatDate(campaignDetails.contentDeadline)})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Post Removal Date:</span>
                <span className="text-sm font-medium text-blue-600">
                  {getDaysLeft(campaignDetails.postRemovalDate)} days left ({formatDate(campaignDetails.postRemovalDate)})
                </span>
              </div>
            </div>
          </div>

          {/* Campaign Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-medium text-green-800">Your Split</h4>
              <p className="text-2xl font-bold text-green-600">{campaignDetails.splitPct}%</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-800">Customer Discount</h4>
              <p className="text-2xl font-bold text-blue-600">{campaignDetails.userDiscountPct}% off</p>
            </div>
          </div>

          {/* Links & Codes */}
          <div className="space-y-3">
            <h4 className="font-medium">Your Campaign Assets</h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Affiliate Link:</label>
                <p className="text-sm font-mono bg-white p-2 rounded border">{campaignDetails.affiliateLink}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Content Coupon Code:</label>
                <p className="text-sm font-mono bg-white p-2 rounded border">{campaignDetails.contentCoupon}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}