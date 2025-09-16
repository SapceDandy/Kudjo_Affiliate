"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { useRealtimeOffers } from '@/lib/hooks/use-realtime-offers';
import { ComplianceNotice } from '@/components/legal/compliance-notice';
import { useRealtimeRequests } from '@/lib/hooks/use-realtime-requests';
import { useBusinessPrograms } from '@/lib/hooks/use-business-programs';
import { useBusinessMetrics } from '@/lib/hooks/use-business-metrics';
import { CreateOfferDialog } from '@/components/business/create-offer-dialog';
import { MessageCenter } from '@/components/messaging/message-center';
import { FindInfluencersDialog } from '@/components/business/find-influencers-dialog';
import { ApprovalStatusBanner } from '@/components/approval-status-banner';
import { useAuth } from '@/lib/auth';
import { 
  DollarSign, 
  MessageSquare, 
  Store,
  Percent,
  TrendingUp,
  Users,
  Clock,
  Download,
  Settings,
  BarChart3,
  Eye,
  Edit,
  Pause,
  Play,
  Square,
  MapPin
} from 'lucide-react';

type DiscountType = 'percentage' | 'dollar' | 'bogo' | 'student' | 'happy_hour' | 'free_appetizer' | 'first_time';

export default function BusinessHome() {
  const { user, loading: authLoading } = useAuth();
  const { offers: realOffers, loading: offersLoading, pauseOffer, resumeOffer, endOffer, createOffer } = useRealtimeOffers();
  const { requests: realRequests, loading: requestsLoading, updateRequest, updateOfferTerms } = useRealtimeRequests();
  const { programs: realPrograms, loading: programsLoading, processPayout, refetch: refetchPrograms } = useBusinessPrograms();
  const { metrics, loading: metricsLoading, error: metricsError } = useBusinessMetrics();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'business')) {
      window.location.href = '/auth/signin';
    }
  }, [user, authLoading]);

  if (authLoading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div></div>;
  if (!user || user.role !== 'business') return null;
  
  // Debug logging
  console.log('Business Dashboard - user:', user);
  console.log('Business Dashboard - realOffers:', realOffers);
  console.log('Business Dashboard - metrics:', metrics);
  
  const [offersSearch, setOffersSearch] = useState('');
  const [requestsSearch, setRequestsSearch] = useState('');
  const [programsSearch, setProgramsSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [messageCenterOpen, setMessageCenterOpen] = useState(false);
  const [updateOfferDialogOpen, setUpdateOfferDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [updateOfferData, setUpdateOfferData] = useState({ discountAmount: '', commissionSplit: '' });
  const [isUpdatingOffer, setIsUpdatingOffer] = useState(false);
  const [tierDefaults, setTierDefaults] = useState({
    Bronze: { defaultSplit: 15, name: 'Bronze', followers: '1K-5K' },
    Silver: { defaultSplit: 20, name: 'Silver', followers: '5K-20K' },
    Gold: { defaultSplit: 25, name: 'Gold', followers: '20K-50K' },
    Platinum: { defaultSplit: 30, name: 'Platinum', followers: '50K+' }
  });
  const [tierLoading, setTierLoading] = useState(false);

  const filteredOffers = realOffers?.filter((offer: any) => 
    offer.title?.toLowerCase().includes(offersSearch.toLowerCase()) && 
    !offer.exclusive
  ) || [];

  const filteredRequests = realRequests?.filter((request: any) => 
    request.status !== 'closed' && 
    request.influencer?.toLowerCase().includes(requestsSearch.toLowerCase())
  ) || [];

  const filteredPrograms = realPrograms?.filter((program: any) => 
    program.influencer?.toLowerCase().includes(programsSearch.toLowerCase())
  ) || [];

  const totalPayoutCents = metrics?.totalPayoutOwed || 0;
  const totalRedemptions = metrics?.totalRedemptions || 0;
  const activeOffers = metrics?.activeOffers || realOffers?.filter((offer: any) => offer.status === 'active').length || 0;
  const pendingRequests = metrics?.pendingRequests || realRequests?.filter((r: any) => r.status === 'pending').length || 0;

  const formatMoney = (cents?: number) => typeof cents === 'number' ? `$${(cents/100).toFixed(2)}` : '$0.00';

  // Load tier defaults on component mount
  useEffect(() => {
    if (!user?.uid) return;
    
    const loadTierDefaults = async () => {
      try {
        const response = await fetch(`/api/business/tier-defaults?businessId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          // Convert old API format to new format if needed
          const apiDefaults = data.tierDefaults;
          if (apiDefaults.S || apiDefaults.M || apiDefaults.L) {
            // Old format - convert to new
            setTierDefaults({
              Bronze: { defaultSplit: apiDefaults.S?.defaultSplit || 15, name: 'Bronze', followers: '1K-5K' },
              Silver: { defaultSplit: apiDefaults.S?.defaultSplit || 15, name: 'Silver', followers: '5K-20K' },
              Gold: { defaultSplit: apiDefaults.M?.defaultSplit || 25, name: 'Gold', followers: '20K-50K' },
              Platinum: { defaultSplit: apiDefaults.L?.defaultSplit || 30, name: 'Platinum', followers: '50K+' }
            });
          } else {
            // New format
            setTierDefaults(apiDefaults);
          }
        }
      } catch (error) {
        console.error('Error loading tier defaults:', error);
      }
    };
    loadTierDefaults();
  }, [user?.uid]);

  const handleExportCampaigns = async () => {
    if (!user?.uid) return;
    
    try {
      const params = new URLSearchParams({
        businessId: user.uid,
        format: 'csv',
        status: 'all'
      });
      
      const response = await fetch(`/api/business/export/campaigns?${params}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaigns-${user.uid}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Campaign data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const saveTierDefaults = async () => {
    if (!user?.uid) return;
    
    setTierLoading(true);
    try {
      // Convert new format back to old API format for saving
      const apiTierDefaults = {
        S: { defaultSplit: tierDefaults.Silver?.defaultSplit || 20, name: 'Silver', followers: '5K-20K' },
        M: { defaultSplit: tierDefaults.Gold?.defaultSplit || 25, name: 'Gold', followers: '20K-50K' },
        L: { defaultSplit: tierDefaults.Platinum?.defaultSplit || 30, name: 'Platinum', followers: '50K+' },
        XL: { defaultSplit: 30, name: 'Diamond', followers: '100K-500K' },
        Huge: { defaultSplit: 35, name: 'Celebrity', followers: '500K+' }
      };

      const response = await fetch(`/api/business/tier-defaults?businessId=${user.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tierDefaults: apiTierDefaults }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save error:', errorData);
        throw new Error('Failed to save tier defaults');
      }

      toast.success('Tier defaults updated successfully!');
      setTierDialogOpen(false);
    } catch (error) {
      console.error('Error saving tier defaults:', error);
      toast.error('Failed to save tier defaults');
    } finally {
      setTierLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header + CTA */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your offers, track performance, and connect with influencers.
          </p>
        </div>

        {/* Approval Status Banner */}
        <ApprovalStatusBanner userType="business" userId={user.uid} className="mb-6" />

        {/* Legal Compliance Notice */}
        <div className="mb-6">
          <ComplianceNotice type="legal" />
        </div>

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
            <Button variant="outline" onClick={handleExportCampaigns}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/business/profile'}>
              <Settings className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button onClick={() => {
              console.log('Create Offer button clicked, setting dialog open to true');
              setCreateDialogOpen(true);
            }}>Create Offer</Button>
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
                  <p className="text-xl font-bold text-orange-600">{pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Influencer Requests */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Influencer Requests</h2>
            <Badge variant="outline">{realRequests.length} total</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search requests..."
              value={requestsSearch}
              onChange={(e) => setRequestsSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {requestsLoading ? (
            <div className="text-center py-8">Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No requests found.</p>
              <Button className="mt-4" onClick={() => setFindDialogOpen(true)}>
                Send Your First Request
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((request: any) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{request.influencer}</CardTitle>
                        <p className="text-sm text-muted-foreground">{request.followers?.toLocaleString()} followers</p>
                        <p className="text-xs text-blue-600">@{request.influencer?.toLowerCase().replace(/\s+/g, '')}</p>
                      </div>
                      <Badge variant={request.status === 'pending' ? 'default' : 
                                   request.status === 'approved' ? 'default' : 
                                   request.status === 'countered' ? 'secondary' : 'destructive'}>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-muted-foreground">Discount</p>
                        <p className="text-sm text-muted-foreground">
                          {request.discountAmount ? `$${request.discountAmount} off` : (
                            request.discountType === 'percentage' ? `${request.userDiscountPct}% off` :
                            request.discountType === 'dollar' ? `$${(request.userDiscountCents || 0) / 100} off` :
                            request.discountType === 'bogo' ? 'BOGO' :
                            request.discountType === 'student' ? 'Student Discount' :
                            request.discountType === 'happy_hour' ? 'Happy Hour' :
                            request.discountType === 'free_appetizer' ? 'Free Appetizer' :
                            request.discountType === 'first_time' ? 'First-Time Customer' : 'Unknown'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Commission</p>
                        <p className="font-semibold text-blue-600">{request.commissionSplit || request.proposedSplitPct}%</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedRequest(request);
                              setUpdateOfferData({
                                discountAmount: request.discountAmount?.toString() || '0',
                                commissionSplit: request.commissionSplit?.toString() || request.proposedSplitPct?.toString() || '5'
                              });
                              setUpdateOfferDialogOpen(true);
                            }}
                          >
                            Update Offer
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => updateRequest(request.id, 'closed')}>
                            Close Request
                          </Button>
                        </>
                      )}
                      {request.status === 'countered' && (
                        <>
                          <Button size="sm" onClick={() => updateRequest(request.id, 'approved')}>Approve</Button>
                          <Button variant="outline" size="sm">Counter</Button>
                          <Button variant="outline" size="sm" onClick={() => updateRequest(request.id, 'declined')}>
                            Decline
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Active Programs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Programs</h2>
            <Badge variant="outline">{realPrograms.length} active</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search programs..."
              value={programsSearch}
              onChange={(e) => setProgramsSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {programsLoading ? (
            <div className="text-center py-8">Loading programs...</div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active programs found.</p>
              <div className="mt-4">
                <Card className="max-w-md mx-auto">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Sarah Martinez</CardTitle>
                        <p className="text-sm text-muted-foreground">@sarahmartinez</p>
                        <p className="text-sm text-muted-foreground">Weekend Brunch Special</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Redemptions</p>
                        <p className="font-semibold text-blue-600">12</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payout Owed</p>
                        <p className="font-semibold text-green-600">$180.00</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Commission Rate</p>
                        <p className="font-semibold">25%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Revenue</p>
                        <p className="font-semibold text-purple-600">$720.00</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => processPayout(['mock_program_001'])}>Process Payout</Button>
                      <Button size="sm" variant="outline">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrograms.map((program: any) => (
                <Card key={program.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{program.influencer}</CardTitle>
                        <p className="text-sm text-muted-foreground">{program.offerTitle}</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Redemptions</p>
                        <p className="font-semibold text-blue-600">{program.redemptions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payout Owed</p>
                        <p className="font-semibold text-green-600">${(program.payoutCents/100).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => processPayout([program.id])}>Process Payout</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Active Offers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Offers</h2>
            <Badge variant="outline">{realOffers?.filter((offer: any) => offer.status === 'active').length || 0} active</Badge>
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
                            if (nextStatus === 'active') {
                              await resumeOffer(o.id);
                            } else {
                              await pauseOffer(o.id);
                            }
                          } catch (error) {
                            console.error('Error updating offer status:', error);
                          }
                        }}
                      >
                        {o.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={async () => {
                          if (confirm('Are you sure you want to end this offer permanently? This action cannot be undone.')) {
                            try {
                              await endOffer(o.id);
                              toast.success('Offer ended successfully');
                            } catch (error) {
                              console.error('Error ending offer:', error);
                              toast.error('Failed to end offer');
                            }
                          }
                        }}
                      >
                        End Offer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Exclusive Offers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Exclusive Offers</h2>
            <Badge variant="outline">{realOffers?.filter((offer: any) => offer.exclusive === true).length || 0} exclusive</Badge>
          </div>
          
          {offersLoading ? (
            <div className="text-center py-8">Loading exclusive offers...</div>
          ) : realOffers?.filter((offer: any) => offer.exclusive === true).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No exclusive offers yet. Exclusive offers are created when you approve influencer requests with the "Make Exclusive" option.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {realOffers?.filter((offer: any) => offer.exclusive === true).map((o: any) => (
                <Card key={o.id} className="hover:shadow-md transition-shadow border-purple-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {o.title}
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">Exclusive</Badge>
                        </CardTitle>
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
                        <p className="text-muted-foreground">Discount</p>
                        <p className="font-semibold text-blue-600">
                          {o.discountType === 'percentage' ? `${o.userDiscountPct}%` : `$${(o.userDiscountCents/100).toFixed(2)}`} off
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min Spend</p>
                        <p className="font-semibold">${(o.minSpendCents/100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Redemptions</p>
                        <p className="font-semibold">{o.redemptionLimit || 'Unlimited'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {o.status === 'active' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => pauseOffer(o.id)}>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => endOffer(o.id)}>
                            <Square className="w-4 h-4 mr-1" />
                            End Offer
                          </Button>
                        </>
                      )}
                      {o.status === 'paused' && (
                        <Button size="sm" onClick={() => resumeOffer(o.id)}>
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      )}
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
        onOfferCreated={() => {}} // Real-time hook will update automatically
      />

      <FindInfluencersDialog 
        open={findDialogOpen} 
        onOpenChange={setFindDialogOpen}
        businessId={user.uid}
        onRequestSent={() => {
          // Dialog will close automatically, no need to refresh as useRealtimeRequests handles updates
        }}
      />

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
                {Object.entries(tierDefaults).map(([tier, tierInfo]) => (
                  <div key={tier} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tierInfo.name} ({tier})</h4>
                      <p className="text-sm text-muted-foreground">{tierInfo.followers} followers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Default Split:</span>
                      <input 
                        type="number" 
                        value={tierInfo.defaultSplit}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          setTierDefaults(prev => ({
                            ...prev,
                            [tier]: { ...prev[tier as keyof typeof prev], defaultSplit: newValue }
                          }));
                        }}
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
                  onClick={saveTierDefaults}
                  disabled={tierLoading}
                  className="flex-1"
                >
                  {tierLoading ? 'Saving...' : 'Save Changes'}
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

      {/* Update Offer Dialog */}
      <Dialog open={updateOfferDialogOpen} onOpenChange={(open) => {
        setUpdateOfferDialogOpen(open);
        if (open && selectedRequest) {
          setUpdateOfferData({
            discountAmount: selectedRequest.discountAmount?.toString() || '',
            commissionSplit: selectedRequest.commissionSplit?.toString() || ''
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Offer</DialogTitle>
            <DialogDescription>
              Modify the terms of your offer to {selectedRequest?.influencer}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Discount Amount</label>
              <Input
                type="number"
                placeholder="Enter new discount amount"
                value={updateOfferData.discountAmount}
                onChange={(e) => setUpdateOfferData(prev => ({ ...prev, discountAmount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Commission Split (%)</label>
              <Input
                type="number"
                placeholder="Enter commission percentage"
                value={updateOfferData.commissionSplit}
                onChange={(e) => setUpdateOfferData(prev => ({ ...prev, commissionSplit: e.target.value }))}
                min="5"
                max="50"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  if (!selectedRequest) return;
                  
                  const requestBody = {
                    discountAmount: parseFloat(updateOfferData.discountAmount) || 0,
                    commissionSplit: Math.max(5, Math.min(50, parseFloat(updateOfferData.commissionSplit) || 5))
                  };
                  
                  setIsUpdatingOffer(true);
                  try {
                    await updateOfferTerms(selectedRequest.id, requestBody.discountAmount, requestBody.commissionSplit);
                    toast.success('Offer updated successfully');
                    setUpdateOfferDialogOpen(false);
                    setSelectedRequest(null);
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to update offer');
                  } finally {
                    setIsUpdatingOffer(false);
                  }
                }}
                className="flex-1"
                disabled={isUpdatingOffer}
              >
                {isUpdatingOffer ? 'Updating...' : 'Update Offer'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setUpdateOfferDialogOpen(false);
                  setSelectedRequest(null);
                }}
                className="flex-1"
                disabled={isUpdatingOffer}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
