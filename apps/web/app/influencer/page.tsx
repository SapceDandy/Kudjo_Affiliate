'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, ExternalLink, QrCode, DollarSign, TrendingUp, Users, Clock, MapPin, Share2, Eye, Target, Calendar, Search, Filter, Star, MessageCircle, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAnalytics } from '@/components/analytics';
import { useInfluencerMetrics } from '@/lib/hooks/use-influencer-metrics';
import { useRealtimeInfluencerRequests } from '@/lib/hooks/use-realtime-influencer-requests';
import { SocialVerificationDialog } from '@/components/social-verification-dialog';
import { ApprovalStatusBanner } from '@/components/approval-status-banner';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface AvailableCampaign {
  id: string;
  title: string;
  description: string;
  businessName: string;
  businessId: string;
  splitPct: number;
  discountType: string;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  maxInfluencers?: number;
  currentInfluencers: number;
  maxRedemptions?: number;
  currentRedemptions: number;
  endAt?: Date;
  status: string;
  createdAt: Date;
}

interface ActiveCampaign {
  id: string;
  title: string;
  description: string;
  businessName: string;
  discount: number;
  type: string;
  status: string;
  minSpend: number;
  couponCode: string;
  couponType: string;
  linkId?: string;
  deadlineAt?: any;
  redemptions: number;
  earnings: number;
  createdAt: any;
}

interface InfluencerRequest {
  id: string;
  title: string;
  description?: string;
  businessName: string;
  businessId: string;
  splitPct: number;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  status: 'pending' | 'countered' | 'approved' | 'declined' | 'closed';
  createdAt: Date;
  updatedAt?: Date;
  businessResponse?: string;
}

export default function InfluencerDashboard() {
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const { metrics, loading: metricsLoading, error: metricsError } = useInfluencerMetrics();
  const { requests, loading: requestsLoading } = useRealtimeInfluencerRequests();
  
  // Available campaigns state
  const [availableCampaigns, setAvailableCampaigns] = useState<AvailableCampaign[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  
  // UI state
  const [selectedCampaign, setSelectedCampaign] = useState<AvailableCampaign | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<InfluencerRequest | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [socialVerificationOpen, setSocialVerificationOpen] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [minSplitPct, setMinSplitPct] = useState('');
  const [maxSplitPct, setMaxSplitPct] = useState('');
  const [businessNameFilter, setBusinessNameFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const itemsPerPage = 12;

  // Fetch available campaigns
  const fetchAvailableCampaigns = async () => {
    if (!user?.uid) return;
    
    setCampaignsLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams({
        infId: user.uid,
        limit: itemsPerPage.toString(),
        offset: offset.toString()
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (businessNameFilter) params.append('businessName', businessNameFilter);
      if (minSplitPct) params.append('minSplitPct', minSplitPct);
      if (maxSplitPct) params.append('maxSplitPct', maxSplitPct);
      
      const response = await fetch(`/api/influencer/available-campaigns?${params}`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      
      const data = await response.json();
      setAvailableCampaigns(data.campaigns || []);
      setTotalCampaigns(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching available campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  };
  
  // Fetch active campaigns
  const fetchActiveCampaigns = async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch(`/api/influencer/active-campaigns?infId=${user.uid}`);
      if (!response.ok) throw new Error('Failed to fetch active campaigns');
      
      const data = await response.json();
      setActiveCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      toast.error('Failed to load active campaigns');
    }
  };
  
  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch(`/api/influencer/profile?uid=${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both old format (direct profile) and new format (wrapped in success/profile)
        const profile = data.profile || data;
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      
      setLoading(true);
      try {
        await Promise.all([
          fetchAvailableCampaigns(),
          fetchActiveCampaigns(),
          fetchUserProfile()
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, currentPage]);

  // Poll for profile updates every 30 seconds to catch admin approvals
  useEffect(() => {
    if (!user?.uid) return;

    const pollInterval = setInterval(() => {
      fetchUserProfile();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [user?.uid]);

  // Refetch campaigns when filters change
  useEffect(() => {
    if (user?.uid) {
      setCurrentPage(1); // Reset to first page when filters change
      fetchAvailableCampaigns();
    }
  }, [searchQuery, businessNameFilter, minSplitPct, maxSplitPct]);

  // Refetch campaigns when page changes
  useEffect(() => {
    if (user?.uid) {
      fetchAvailableCampaigns();
    }
  }, [currentPage]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy');
    }
  };
  
  const handleJoinCampaign = async () => {
    if (!selectedCampaign || !legalAccepted) return;
    
    // Check if user has verified social accounts
    if (!userProfile?.hasVerifiedSocial) {
      setJoinDialogOpen(false);
      setSocialVerificationOpen(true);
      toast.error('Please verify at least one social media account to join campaigns');
      return;
    }
    
    try {
      const response = await fetch('/api/influencer/join-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedCampaign.id,
          infId: user?.uid,
          legalAccepted: true
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join campaign');
      }
      
      const result = await response.json();
      toast.success('Successfully joined campaign!');
      setJoinDialogOpen(false);
      setSelectedCampaign(null);
      setLegalAccepted(false);
      
      // Refresh data
      fetchAvailableCampaigns();
      fetchActiveCampaigns();
      
      trackEvent('campaign_joined');
    } catch (error: any) {
      console.error('Error joining campaign:', error);
      toast.error(error.message || 'Failed to join campaign');
    }
  };
  
  const handleRequestResponse = async (requestId: string, action: 'accept' | 'decline' | 'counter', counterData?: { splitPct: number; message: string }) => {
    try {
      const response = await fetch('/api/influencer/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          ...counterData
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update request');
      }
      
      toast.success(`Request ${action}ed successfully!`);
      setRequestDialogOpen(false);
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast.error(error.message || 'Failed to update request');
    }
  };
  
  const formatDiscount = (campaign: AvailableCampaign) => {
    switch (campaign.discountType) {
      case 'percent':
        return `${campaign.userDiscountPct}% off`;
      case 'dollar':
        return `$${(campaign.userDiscountCents! / 100).toFixed(2)} off`;
      case 'bogo':
        return 'BOGO';
      default:
        return campaign.discountType;
    }
  };

  // Show platinum tier (80%) split for unverified users, actual tier split for verified users
  const getDisplaySplitPct = (campaign: AvailableCampaign) => {
    if (!userProfile?.hasVerifiedSocial) {
      return 80; // Platinum tier default
    }
    return campaign.splitPct;
  };

  const handleSocialVerificationComplete = async (accounts: any[]) => {
    // Update user profile with verified accounts
    setUserProfile((prev: any) => ({
      ...prev,
      socialAccounts: accounts,
      hasVerifiedSocial: accounts.length > 0,
    }));
    toast.success('Social media accounts verified successfully!');
    
    // Force refresh user profile from server to get updated tier and social data
    setTimeout(async () => {
      await fetchUserProfile();
      
      // Also refresh campaigns and metrics since tier may have changed
      await Promise.all([
        fetchAvailableCampaigns(),
        fetchActiveCampaigns()
      ]);
    }, 1000); // Give server time to update
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Approval Status Banner */}
      <ApprovalStatusBanner userType="influencer" userId={user?.uid || ''} className="mb-6" />
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Influencer Dashboard</h1>
            <p className="text-gray-600">Track your campaigns and earnings</p>
          </div>
          <div className="flex items-center gap-4">
            {userProfile?.hasVerifiedSocial ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Verified</span>
                  <span className="text-sm text-gray-500">({userProfile.tier} Tier)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {userProfile.socialAccounts?.map((account: any) => (
                    <span key={account.platform} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                      {account.platform === 'instagram' && '📷'}
                      {account.platform === 'tiktok' && '🎵'}
                      {account.platform === 'youtube' && '📺'}
                      {account.platform === 'twitter' && '🐦'}
                      @{account.handle}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setSocialVerificationOpen(true)}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Verify Social Accounts
              </Button>
            )}
          </div>
        </div>
        
        {!userProfile?.hasVerifiedSocial && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Social Media Verification Required</p>
                <p>You can browse campaigns, but you'll need to verify at least one social media account to join them. Currently showing Platinum tier rates.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">${metrics ? (metrics.totalEarnings / 100).toFixed(2) : '0.00'}</p>
            <p className="text-xs text-muted-foreground">+${metrics ? (metrics.weeklyEarnings / 100).toFixed(2) : '0.00'} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{metrics?.activeCampaigns || 0}</p>
            {!userProfile?.hasVerifiedSocial && (
              <p className="text-xs text-orange-600 mt-1">Verify social to join campaigns</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{metrics?.totalRedemptions || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{metrics?.conversionRate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="discover" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discover">Discover Campaigns</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCampaigns.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* Discover Campaigns Tab */}
        <TabsContent value="discover" className="space-y-6">
          {/* Campaign Count Display */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Available Campaigns</h3>
            <div className="text-sm text-gray-500">
              {totalCampaigns > 0 ? `${totalCampaigns} campaigns available` : 'Loading campaigns...'}
            </div>
          </div>
          
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5" />
                Find Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="business">Business</Label>
                  <Input
                    id="business"
                    placeholder="Business name..."
                    value={businessNameFilter}
                    onChange={(e) => setBusinessNameFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="minSplit">Min Split %</Label>
                  <Input
                    id="minSplit"
                    type="number"
                    placeholder="0"
                    value={minSplitPct}
                    onChange={(e) => setMinSplitPct(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxSplit">Max Split %</Label>
                  <Input
                    id="maxSplit"
                    type="number"
                    placeholder="100"
                    value={maxSplitPct}
                    onChange={(e) => setMaxSplitPct(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Campaigns */}
          <div className="space-y-4">
            {campaignsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
              </div>
            ) : availableCampaigns.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns available</h3>
                  <p className="text-gray-500">Try adjusting your filters or check back later for new opportunities.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="space-y-2">
                        <CardTitle className="text-lg">{campaign.title}</CardTitle>
                        <p className="text-gray-600 font-medium">{campaign.businessName}</p>
                        <p className="text-sm text-gray-500">{campaign.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Badge variant="outline">
                          {getDisplaySplitPct(campaign)}% split
                        </Badge>
                        <p className="text-sm text-gray-500">{formatDiscount(campaign)}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {campaign.currentInfluencers}/{campaign.maxInfluencers || '∞'}
                          </span>
                          {campaign.endAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Ends {new Date(campaign.endAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <Button 
                          onClick={() => {
                            if (!userProfile?.hasVerifiedSocial) {
                              setSocialVerificationOpen(true);
                              toast.error('Please verify your social media accounts first');
                              return;
                            }
                            setSelectedCampaign(campaign);
                            setJoinDialogOpen(true);
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          Join Campaign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCampaigns)} of {totalCampaigns} campaigns
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage <= 3 
                        ? i + 1 
                        : currentPage >= totalPages - 2 
                          ? totalPages - 4 + i 
                          : currentPage - 2 + i;
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Active Campaigns Tab */}
        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCampaigns.map((campaign) => (
              <Card key={campaign.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                      <p className="text-gray-600">{campaign.businessName}</p>
                      <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Active</Badge>
                      <p className="text-sm text-gray-500 mt-1">{campaign.type === 'percentage' ? `${campaign.discount}%` : `$${campaign.discount}`} discount</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaign.deadlineAt && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Calendar className="w-4 h-4" />
                        <span>Content deadline: {new Date(campaign.deadlineAt.toDate ? campaign.deadlineAt.toDate() : campaign.deadlineAt).toLocaleDateString()}</span>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Affiliate Link */}
                      {campaign.linkId && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Affiliate Link
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-xs">
                                {`${process.env.NEXT_PUBLIC_APP_URL || 'https://kudjo.app'}/r/${campaign.linkId}`}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL || 'https://kudjo.app'}/r/${campaign.linkId}`)}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content Coupon */}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <QrCode className="w-4 h-4" />
                          {campaign.couponType === 'AFFILIATE' ? 'Affiliate Code' : 'Content Coupon'}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {campaign.couponCode}
                            </code>
                            <Badge variant="default">
                              Available
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-gray-600">
                        <span>Started {new Date(campaign.createdAt.toDate ? campaign.createdAt.toDate() : campaign.createdAt).toLocaleDateString()}</span>
                        <span className="ml-4">{campaign.redemptions} redemptions</span>
                      </div>
                      <span className="font-medium text-green-600">
                        Earned: ${(campaign.earnings / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {activeCampaigns.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active campaigns</h3>
                  <p className="text-gray-500">Join some campaigns to start earning!</p>
                  <Button 
                    onClick={() => {
                      const tab = document.querySelector('[value="discover"]') as HTMLElement;
                      tab?.click();
                    }}
                    className="mt-4"
                  >
                    Discover Campaigns
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      <p className="text-gray-600">{request.businessName}</p>
                      {request.description && <p className="text-sm text-gray-500 mt-1">{request.description}</p>}
                    </div>
                    <div className="text-right">
                      <Badge variant={request.status === 'pending' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">{request.splitPct}% split</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Received {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRequestResponse(request.id, 'decline')}
                        >
                          Decline
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleRequestResponse(request.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {requests.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                  <p className="text-gray-500">Businesses will send you collaboration requests here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardContent className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Messages</h3>
              <p className="text-gray-500">Chat with businesses about collaborations.</p>
              <p className="text-sm text-gray-400 mt-2">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Join Campaign Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.title}</DialogTitle>
            <DialogDescription>
              Join {selectedCampaign?.businessName}'s campaign
            </DialogDescription>
            {selectedCampaign && (
              <div className="space-y-2 mt-4">
                <p><strong>{selectedCampaign.title}</strong></p>
                <p>by {selectedCampaign.businessName}</p>
                <p className="text-sm text-gray-600">{selectedCampaign?.description}</p>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Requirements:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Use your content coupon within 7 days</li>
                <li>• Post content within 7 days of redemption</li>
                <li>• Keep post live for at least 7 days</li>
                <li>• Include proper FTC disclosure</li>
              </ul>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="legal" 
                checked={legalAccepted}
                onCheckedChange={(checked) => setLegalAccepted(!!checked)}
              />
              <Label htmlFor="legal" className="text-sm">
                I agree to the terms and requirements above
              </Label>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setJoinDialogOpen(false);
                  setLegalAccepted(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleJoinCampaign}
                disabled={!legalAccepted}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Join Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Verification Dialog */}
      <SocialVerificationDialog
        open={socialVerificationOpen}
        onOpenChange={setSocialVerificationOpen}
        userId={user?.uid || ''}
        currentAccounts={userProfile?.socialAccounts || []}
        onVerificationComplete={handleSocialVerificationComplete}
      />
    </div>
  );
}