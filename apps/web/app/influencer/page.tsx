'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loading } from '@/components/ui/loading';
import { MapPin, DollarSign, Clock, Users, Search, Filter, X } from 'lucide-react';
import { useAvailableCampaigns } from '@/lib/hooks/use-available-campaigns';
import { useRealtimeInfluencerRequests } from '@/lib/hooks/use-realtime-influencer-requests';
import { ClaimOfferDialog } from './claim-offer-dialog';
import toast from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState('nearby');
  const [mainView, setMainView] = useState('dashboard'); // 'dashboard' or 'deals'
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [negotiatingRequest, setNegotiatingRequest] = useState<string | null>(null);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [selectedActiveOfferId, setSelectedActiveOfferId] = useState<string | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    businessName: '',
    minSplitPct: '',
    maxSplitPct: '',
    discountType: 'all'
  });
  
  const { 
    campaigns: availableCampaigns, 
    loading: campaignsLoading, 
    error: campaignsError,
    hasMore: campaignsHasMore,
    loadMore: loadMoreCampaigns,
    refetch: refetchCampaigns,
    search: searchCampaigns,
    filter: filterCampaigns,
    clearFilters: clearCampaignFilters
  } = useAvailableCampaigns();
  
  // Real-time requests data
  const { 
    requests, 
    loading: reqLoading, 
    error: reqError,
    respondToRequest 
  } = useRealtimeInfluencerRequests();
  
  // Real active campaigns data
  const [activeCampaignsLoading, setActiveCampaignsLoading] = useState(true);
  
  // Load active campaigns and requests
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load active campaigns
        const campaignsRes = await fetch('/api/influencer/active-campaigns');
        if (campaignsRes.ok) {
          const campaignsData = await campaignsRes.json();
          setActiveCampaigns(campaignsData.campaigns || []);
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setActiveCampaignsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Search and filter handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchCampaigns(query);
  };

  const handleFilter = () => {
    const filterObj = {
      businessName: filters.businessName || undefined,
      minSplitPct: filters.minSplitPct ? parseInt(filters.minSplitPct) : undefined,
      maxSplitPct: filters.maxSplitPct ? parseInt(filters.maxSplitPct) : undefined,
      discountType: filters.discountType as 'percentage' | 'fixed' | undefined
    };
    filterCampaigns(filterObj);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      businessName: '',
      minSplitPct: '',
      maxSplitPct: '',
      discountType: 'all'
    });
    clearCampaignFilters();
  };

  const getTimeAgo = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const handleClaimCampaign = (offerId: string) => {
    setSelectedCampaign(offerId);
    setShowClaimDialog(true);
  };

  const handleShareCampaign = async (couponId: string, platform: string = 'instagram') => {
    try {
      const response = await fetch('/api/influencer/share-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId, platform })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Copy share URL to clipboard
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success('Share link copied to clipboard!');
      } else {
        toast.error('Failed to generate share link');
      }
    } catch (error) {
      console.error('Error sharing campaign:', error);
      toast.error('Failed to share campaign');
    }
  };

  const handleSubmitContent = async (couponId: string, contentData: any) => {
    try {
      const response = await fetch('/api/influencer/submit-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId, ...contentData })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Content submitted successfully!');
        // Refresh active campaigns
        const loadData = async () => {
          const campaignsRes = await fetch('/api/influencer/active-campaigns');
          if (campaignsRes.ok) {
            const campaignsData = await campaignsRes.json();
            setActiveCampaigns(campaignsData.campaigns || []);
          }
        };
        loadData();
      } else {
        toast.error('Failed to submit content');
      }
    } catch (error) {
      console.error('Error submitting content:', error);
      toast.error('Failed to submit content');
    }
  };

  const handleSendNegotiation = async (negotiationData: any) => {
    try {
      const response = await fetch('/api/influencer/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: negotiatingRequest,
          action: 'counter',
          counterOffer: negotiationData
        })
      });
      
      if (response.ok) {
        toast.success('Counter-offer sent successfully!');
        // Real-time hook will update automatically
      } else {
        toast.error('Failed to send counter-offer');
      }
    } catch (error) {
      console.error('Error sending negotiation:', error);
      toast.error('Failed to send counter-offer');
    }
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
          {mainView === 'deals' && (
            <Button 
              variant="outline"
              onClick={() => setMainView('dashboard')}
            >
              ← Back to Dashboard
            </Button>
          )}
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
          {/* Search and Filter Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search campaigns, businesses, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              {(searchQuery || Object.values(filters).some(f => f)) && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Business Name</label>
                    <Input
                      placeholder="Filter by business..."
                      value={filters.businessName}
                      onChange={(e) => setFilters(prev => ({ ...prev, businessName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Min Split %</label>
                    <Input
                      type="number"
                      placeholder="e.g. 20"
                      value={filters.minSplitPct}
                      onChange={(e) => setFilters(prev => ({ ...prev, minSplitPct: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Split %</label>
                    <Input
                      type="number"
                      placeholder="e.g. 50"
                      value={filters.maxSplitPct}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxSplitPct: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Discount Type</label>
                    <Select value={filters.discountType} onValueChange={(value) => setFilters(prev => ({ ...prev, discountType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any type</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleFilter}>Apply Filters</Button>
                </div>
              </Card>
            )}
          </div>

          {campaignsLoading && <Loading />}
          
          {campaignsError && (
            <div className="text-red-600 text-sm">{campaignsError}</div>
          )}
          
          {!campaignsLoading && !campaignsError && (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Found {availableCampaigns.length} available campaigns
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCampaigns.map((campaign: any) => (
                  <CampaignCard 
                    key={campaign.id} 
                    campaign={{
                      id: campaign.id,
                      title: campaign.title,
                      description: campaign.description,
                      splitPct: campaign.splitPct,
                      minSpend: campaign.minSpend,
                      businessName: campaign.businessName || 'Unknown Business',
                      businessId: campaign.bizId,
                      status: campaign.active ? 'active' : 'ended',
                      expiresAt: campaign.endAt,
                      maxInfluencers: campaign.maxInfluencers,
                      currentInfluencers: campaign.currentInfluencers
                    }} 
                    showDistance={false}
                    onStart={handleClaimCampaign}
                  />
                ))}
              </div>
              
              {campaignsHasMore && (
                <Button variant="outline" className="w-full" onClick={loadMoreCampaigns}>
                  Load More
                </Button>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search campaigns, businesses, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              {(searchQuery || Object.values(filters).some(f => f)) && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Business Name</label>
                    <Input
                      placeholder="Filter by business..."
                      value={filters.businessName}
                      onChange={(e) => setFilters(prev => ({ ...prev, businessName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Min Split %</label>
                    <Input
                      type="number"
                      placeholder="e.g. 20"
                      value={filters.minSplitPct}
                      onChange={(e) => setFilters(prev => ({ ...prev, minSplitPct: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Split %</label>
                    <Input
                      type="number"
                      placeholder="e.g. 50"
                      value={filters.maxSplitPct}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxSplitPct: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Discount Type</label>
                    <Select value={filters.discountType} onValueChange={(value) => setFilters(prev => ({ ...prev, discountType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any type</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleFilter}>Apply Filters</Button>
                </div>
              </Card>
            )}
          </div>

          {campaignsLoading && <Loading />}
          
          {campaignsError && (
            <div className="text-red-600 text-sm">{campaignsError}</div>
          )}
          
          {!campaignsLoading && !campaignsError && (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Found {availableCampaigns.length} available campaigns
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCampaigns.map((campaign: any) => (
                  <CampaignCard 
                    key={campaign.id} 
                    campaign={{
                      id: campaign.id,
                      title: campaign.title,
                      description: campaign.description,
                      splitPct: campaign.splitPct,
                      minSpend: campaign.minSpend,
                      businessName: campaign.businessName || 'Unknown Business',
                      businessId: campaign.bizId,
                      status: campaign.active ? 'active' : 'ended',
                      expiresAt: campaign.endAt,
                      maxInfluencers: campaign.maxInfluencers,
                      currentInfluencers: campaign.currentInfluencers
                    }} 
                    showDistance={false}
                    onStart={handleClaimCampaign}
                  />
                ))}
              </div>
              
              {campaignsHasMore && (
                <Button variant="outline" className="w-full" onClick={loadMoreCampaigns}>
                  Load More
                </Button>
              )}
            </>
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
                        {r.status === 'countered' && (
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
                        <span className="font-medium">{r.businessName}</span>
                      </div>

                      {r.businessResponse && (
                        <div className="bg-blue-50 border border-blue-200 p-2 rounded text-sm">
                          <p className="font-medium text-blue-800">Business Response:</p>
                          <p className="text-blue-700">{r.businessResponse}</p>
                        </div>
                      )}

                      <div className="pt-2 space-y-2">
                        {r.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1" 
                              onClick={() => {
                                toast.success(`Request accepted! Campaign will begin shortly.`);
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
                        )}
                        {r.status === 'countered' && (
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1" 
                              onClick={() => {
                                respondToRequest(r.id, 'accept');
                              }}
                            >
                              Accept Counter-Offer
                            </Button>
                            <Button 
                              className="flex-1" 
                              variant="outline"
                              onClick={() => setNegotiatingRequest(r.id)}
                            >
                              Counter Again
                            </Button>
                          </div>
                        )}
                        {r.status === 'approved' && (
                          <div className="text-center py-2">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              ✓ Accepted - Campaign Active
                            </Badge>
                          </div>
                        )}
                        {r.status === 'declined' && (
                          <div className="text-center py-2">
                            <Badge variant="destructive" className="bg-red-100 text-red-800">
                              ✗ Declined
                            </Badge>
                          </div>
                        )}
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">My Programs</h3>
              <p className="text-sm text-muted-foreground">{activeCampaigns.length} active campaigns</p>
            </div>
          </div>
          
          {activeCampaignsLoading ? (
            <Loading />
          ) : activeCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No active campaigns yet.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setMainView('deals')}
              >
                Browse Available Deals
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCampaigns.map((c: any) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{c.title}</CardTitle>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{c.businessName}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Earnings</p>
                          <p className="text-lg font-bold text-green-600">${(c.earnings / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Redemptions</p>
                          <p className="text-lg font-bold">{c.redemptions}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Content Due</p>
                          <p className="text-sm text-orange-600">
                            {c.deadlineAt ? Math.max(0, Math.ceil((new Date(c.deadlineAt.toDate()).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) + ' days' : 'No deadline'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Coupon Code</p>
                          <p className="text-sm font-mono">{c.couponCode}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setViewingCampaign(c.id)}
                        >
                          View Details
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleShareCampaign(c.id)}
                        >
                          Share Campaign
                        </Button>
                        {c.couponType === 'CONTENT_MEAL' && !c.contentSubmitted && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => {
                              // Simple content submission for demo
                              const contentUrl = prompt('Enter content URL (Instagram post, TikTok video, etc.):');
                              const caption = prompt('Enter caption (optional):');
                              if (contentUrl) {
                                handleSubmitContent(c.id, {
                                  contentType: 'photo',
                                  contentUrl,
                                  caption,
                                  platform: 'instagram'
                                });
                              }
                            }}
                          >
                            Submit Content
                          </Button>
                        )}
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
                    <p className="text-xl font-bold text-blue-600">{activeCampaigns.length}</p>
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
            {activeCampaigns.length === 0 ? (
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
                {activeCampaigns.map((c: any) => (
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
                          <p className="text-sm text-muted-foreground">{r.businessId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{getTimeAgo(r.createdAt)}</p>
                          {r.status === 'countered' && (
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

      {selectedCampaign && showClaimDialog && (
        <ClaimOfferDialog
          offerId={selectedCampaign}
          open={showClaimDialog}
          onClose={() => {
            setSelectedCampaign(null);
            setShowClaimDialog(false);
          }}
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
                  
                // Send negotiation via API
                fetch('/api/influencer/requests', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    requestId,
                    status: 'negotiating',
                    proposedSplitPct: splitPct,
                    proposedDiscountType: discountType,
                    proposedUserDiscountPct: userDiscountPct,
                    proposedUserDiscountCents: userDiscountCents,
                    proposedMinSpend: minSpend,
                    message
                  })
                }).then(() => {
                  toast.success('Negotiation sent!');
                }).catch(() => {
                  toast.error('Failed to send negotiation');
                });
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