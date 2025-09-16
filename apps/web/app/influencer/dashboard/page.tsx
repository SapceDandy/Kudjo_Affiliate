'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, ExternalLink, QrCode, DollarSign, TrendingUp, Users, Clock, MapPin, Share2, Eye, Target, Calendar } from 'lucide-react';
import { useDemoAuth } from '@/lib/demo-auth';
import { useAnalytics } from '@/components/analytics';
import { useInfluencerMetrics } from '@/lib/hooks/use-influencer-metrics';
import { useInfluencerCampaigns } from '@/lib/hooks/use-influencer-campaigns';
import Image from 'next/image';

interface Campaign {
  id: string;
  offerId: string;
  businessName: string;
  offerTitle: string;
  splitPct: number;
  status: 'active' | 'completed' | 'expired' | 'pending' | 'declined' | 'available';
  affiliateLink?: {
    url: string;
    qrUrl: string;
  };
  contentCoupon?: {
    code: string;
    qrUrl: string;
    used: boolean;
  };
  earnings: number;
  createdAt: string;
  deadline?: string;
  campaignId: string;
  linkId?: string;
  linkStatus?: string;
}

interface DashboardStats {
  totalEarnings: number;
  activeCampaigns: number;
  completedCampaigns: number;
  pendingPayout: number;
}

export default function InfluencerDashboard() {
  const { user } = useDemoAuth();
  const { trackEvent } = useAnalytics();
  const { metrics, loading: metricsLoading, error: metricsError } = useInfluencerMetrics();
  const { campaigns, loading, error, acceptCampaign, declineCampaign, requestPayout } = useInfluencerCampaigns('invited');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Influencer Dashboard</h1>
        <p className="text-gray-600">Track your campaigns and earnings</p>
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

      {/* Campaigns Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <div className="grid gap-6">
            {campaigns.filter(c => c.status === 'pending').map((campaign) => (
              <Card key={campaign.id} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.offerTitle}</CardTitle>
                      <p className="text-gray-600">{campaign.businessName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">Pending</Badge>
                      <p className="text-sm text-gray-500 mt-1">{campaign.splitPct}% split</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={async () => {
                        try {
                          await acceptCampaign(campaign.campaignId);
                        } catch (err) {
                          console.error('Failed to accept campaign:', err);
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          await declineCampaign(campaign.campaignId);
                        } catch (err) {
                          console.error('Failed to decline campaign:', err);
                        }
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="grid gap-6">
            {campaigns.filter(c => c.status === 'active').map((campaign) => (
              <Card key={campaign.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.offerTitle}</CardTitle>
                      <p className="text-gray-600">{campaign.businessName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Active</Badge>
                      <p className="text-sm text-gray-500 mt-1">{campaign.splitPct}% split</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaign.deadline && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Calendar className="w-4 h-4" />
                        <span>Content deadline: {new Date(campaign.deadline).toLocaleDateString()}</span>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Affiliate Link */}
                      {campaign.affiliateLink && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Affiliate Link
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-xs">
                                {campaign.affiliateLink.url}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(campaign.affiliateLink!.url)}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content Coupon */}
                      {campaign.contentCoupon && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            Content Coupon
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                                {campaign.contentCoupon.code}
                              </code>
                              <Badge variant={campaign.contentCoupon.used ? 'secondary' : 'default'}>
                                {campaign.contentCoupon.used ? 'Used' : 'Available'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-gray-600">
                        Started {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                      <span className="font-medium text-green-600">
                        Earned: ${campaign.earnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="grid gap-6">
            {campaigns.filter(c => c.status === 'completed').map((campaign) => (
              <Card key={campaign.id} className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.offerTitle}</CardTitle>
                      <p className="text-gray-600">{campaign.businessName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Completed</Badge>
                      <p className="text-sm text-gray-500 mt-1">{campaign.splitPct}% split</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Completed {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-green-600">
                      Earned: ${campaign.earnings.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className={`border-l-4 ${
                campaign.status === 'active' ? 'border-l-blue-500' : 
                campaign.status === 'completed' ? 'border-l-green-500' : 'border-l-gray-300'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.offerTitle}</CardTitle>
                      <p className="text-gray-600">{campaign.businessName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">{campaign.splitPct}% split</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {campaign.status === 'completed' ? 'Completed' : 'Started'} {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-green-600">
                      Earned: ${campaign.earnings.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="mt-8 flex gap-4">
        <Button onClick={() => window.location.href = '/influencer'}>
          <Target className="w-4 h-4 mr-2" />
          Browse Campaigns
        </Button>
        <Button 
          variant="outline"
          onClick={async () => {
            try {
              const activeCampaigns = campaigns.filter(c => c.status === 'active' && c.linkId);
              if (activeCampaigns.length === 0) {
                alert('No active campaigns available for payout');
                return;
              }
              const linkIds = activeCampaigns.map(c => c.linkId!);
              await requestPayout(linkIds, 'bank_transfer');
              alert('Payout request submitted successfully');
            } catch (err) {
              console.error('Failed to request payout:', err);
              alert('Failed to request payout. Please try again.');
            }
          }}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Request Payout
        </Button>
      </div>
    </div>
  );
} 