'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CampaignManagement } from '@/components/influencer/campaign-management';
import { 
  User,
  Plus,
  Search,
  RefreshCw,
} from 'lucide-react';

export default function InfluencerDashboard() {
  const [loading, setLoading] = useState(true);
  const [influencerId, setInfluencerId] = useState<string | null>(null);

  // Simulate loading user data
  useEffect(() => {
    // In a real app, this would fetch the user's data from an API
    setTimeout(() => {
      // Mock influencer ID
      setInfluencerId('inf_123');
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Influencer Dashboard</h1>
          <p className="text-gray-600">Manage your campaigns and track your performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-brand hover:bg-brand/90">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Welcome Card */}
      <Card className="mb-6 bg-gradient-to-r from-brand/10 to-purple-50 border-brand/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
              <User className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Welcome back!</h2>
              <p className="text-gray-600">
                You have {Math.floor(Math.random() * 5)} active campaigns and {Math.floor(Math.random() * 10)} new redemptions since your last login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Find Businesses Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Businesses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for businesses to partner with..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <Button className="bg-brand hover:bg-brand/90">
              Search
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Food & Beverage</Button>
            <Button variant="outline" size="sm">Retail</Button>
            <Button variant="outline" size="sm">Fashion</Button>
            <Button variant="outline" size="sm">Technology</Button>
            <Button variant="outline" size="sm">Health & Wellness</Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Management */}
      {influencerId && <CampaignManagement influencerId={influencerId} />}
    </div>
  );
} 