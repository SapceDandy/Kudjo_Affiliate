'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Trash,
  AlertTriangle,
  Calendar,
  DollarSign,
  BarChart3,
  Tag,
  Building2,
  Eye,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  code: string;
  businessId: string;
  businessName: string;
  status: 'active' | 'expired' | 'redeemed';
  createdAt: string;
  expiresAt?: string;
  redemptions: number;
  revenue: number;
}

interface CampaignManagementProps {
  influencerId: string;
}

export function CampaignManagement({ influencerId }: CampaignManagementProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'redeemed'>('all');

  // Fetch campaigns on mount
  useState(() => {
    // In a real app, this would be an API call
    // For now, use mock data
    setTimeout(() => {
      const mockCampaigns = generateMockCampaigns();
      setCampaigns(mockCampaigns);
      setLoading(false);
    }, 500);
  });

  // Generate mock campaigns
  const generateMockCampaigns = (): Campaign[] => {
    const idNumber = parseInt(influencerId.split('_')[1]);
    
    return Array.from({ length: 10 }, (_, i) => {
      const isActive = Math.random() > 0.3;
      const isExpired = !isActive && Math.random() > 0.5;
      return {
        id: `campaign_${i}`,
        code: `INF${idNumber}BIZ${i}`,
        businessId: `biz_${i + 10}`,
        businessName: `Business ${i + 10}`,
        status: isActive ? 'active' : isExpired ? 'expired' : 'redeemed',
        createdAt: new Date(Date.now() - Math.random() * 5000000000).toISOString(),
        expiresAt: isExpired ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
        redemptions: Math.floor(Math.random() * 50),
        revenue: Math.floor(Math.random() * 5000) * 100,
      };
    });
  };

  // Delete campaign
  const handleDeleteCampaign = () => {
    if (!deletingCampaign) return;
    
    // In a real app, this would be an API call
    // For now, update local state
    setCampaigns(campaigns.filter(c => c.id !== deletingCampaign.id));
    setDeletingCampaign(null);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'redeemed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter campaigns
  const filteredCampaigns = filter === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.status === filter);

  // Calculate stats
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalRedemptions = campaigns.reduce((sum, c) => sum + c.redemptions, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Active Campaigns</div>
                <div className="text-2xl font-bold">{activeCampaigns}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Total Redemptions</div>
                <div className="text-2xl font-bold">{totalRedemptions}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Campaigns</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-brand hover:bg-brand/90' : ''}
              >
                All
              </Button>
              <Button 
                variant={filter === 'active' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('active')}
                className={filter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Active
              </Button>
              <Button 
                variant={filter === 'expired' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('expired')}
                className={filter === 'expired' ? 'bg-gray-600 hover:bg-gray-700' : ''}
              >
                Expired
              </Button>
              <Button 
                variant={filter === 'redeemed' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('redeemed')}
                className={filter === 'redeemed' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Redeemed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading campaigns...
                    </TableCell>
                  </TableRow>
                ) : filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No campaigns found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-mono font-medium">
                        {campaign.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          {campaign.businessName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          {formatDate(campaign.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {campaign.expiresAt ? formatDate(campaign.expiresAt) : 'No expiry'}
                      </TableCell>
                      <TableCell>{campaign.redemptions}</TableCell>
                      <TableCell>{formatCurrency(campaign.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {campaign.status === 'active' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeletingCampaign(campaign)}
                                >
                                  <Trash className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Campaign</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete this campaign? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                                    <div>
                                      <h4 className="font-medium text-red-800">Warning</h4>
                                      <p className="text-sm text-red-700">
                                        Deleting this campaign will remove it from your profile and the business's system. 
                                        Any active promotions will be stopped immediately.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-4 p-4 border rounded-lg">
                                    <div className="flex justify-between mb-2">
                                      <span className="font-medium">Campaign Code:</span>
                                      <span className="font-mono">{deletingCampaign?.code}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                      <span className="font-medium">Business:</span>
                                      <span>{deletingCampaign?.businessName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium">Created:</span>
                                      <span>{deletingCampaign && formatDate(deletingCampaign.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setDeletingCampaign(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleDeleteCampaign}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Delete Campaign
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 