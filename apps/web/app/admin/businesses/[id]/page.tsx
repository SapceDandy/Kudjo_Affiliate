'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Tag,
  DollarSign,
} from 'lucide-react';
import { PricingTiers } from '@/components/business/pricing-tiers';

interface Business {
  id: string;
  name: string;
  email: string;
  ownerName: string;
  industry: string;
  createdAt: string;
  status: string;
  influencerCount: number;
  couponCount: number;
  revenue: number;
}

export default function BusinessDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch business data
  useEffect(() => {
    // In a real app, fetch from API
    // For now, use mock data
    setTimeout(() => {
      const mockBusiness: Business = {
        id: params.id,
        name: `Business ${params.id.split('_')[1]} Inc.`,
        email: `business${params.id.split('_')[1]}@example.com`,
        ownerName: `Owner ${params.id.split('_')[1]}`,
        industry: 'Retail',
        createdAt: new Date().toISOString(),
        status: 'active',
        influencerCount: 12,
        couponCount: 34,
        revenue: 45000 * 100, // in cents
      };
      
      setBusiness(mockBusiness);
      setLoading(false);
    }, 500);
  }, [params.id]);

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Go back
  const goBack = () => {
    router.push('/admin/businesses');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">Loading business data...</div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || 'Business not found'}
        </div>
        <Button variant="outline" className="mt-4" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Businesses
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Business Details</h1>
      </div>

      {/* Business Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Business Logo */}
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <span className="text-4xl text-gray-600">
                {business.name.charAt(0)}
              </span>
            </div>
            
            {/* Business Details */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold">{business.name}</h2>
                <Badge className="bg-green-100 text-green-800">
                  {business.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span>{business.ownerName}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Joined {new Date(business.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span>{business.industry}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>{business.influencerCount} influencers</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Influencers</div>
                <div className="text-2xl font-bold">{business.influencerCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Tag className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Coupons</div>
                <div className="text-2xl font-bold">{business.couponCount}</div>
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
                <div className="text-sm font-medium text-gray-500">Revenue</div>
                <div className="text-2xl font-bold">{formatCurrency(business.revenue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for tabs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pricing Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingTiers businessId={params.id} isAdmin={true} />
        </CardContent>
      </Card>
    </div>
  );
}
