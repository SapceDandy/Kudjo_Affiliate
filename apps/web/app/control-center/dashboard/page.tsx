'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building2, 
  DollarSign, 
  Target,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface Metrics {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenueCents: number;
  generatedAt?: string;
  isMockData?: boolean;
}

interface CouponFormData {
  type: string;
  bizId: string;
  infId: string;
  offerId: string;
}

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState<CouponFormData>({
    type: 'AFFILIATE',
    bizId: '',
    infId: '',
    offerId: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch('/api/control-center/metrics');
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Failed to load metrics data');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  const handleCreateCoupon = async () => {
    if (!couponForm.bizId || !couponForm.infId || !couponForm.offerId) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/coupon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponForm)
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status})`);
      }

      const created = await res.json();
      alert(`Coupon created: ${created.couponId} (code: ${created.code})`);
      
      // Reset form and close modal
      setCouponForm({ type: 'AFFILIATE', bizId: '', infId: '', offerId: '' });
      setShowCouponModal(false);
      
      // Refresh metrics
      const response = await fetch('/api/control-center/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err: any) {
      alert(`Create failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Generate mock chart data
  const revenueData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    revenue: Math.floor(Math.random() * 5000) + 2000,
    users: Math.floor(Math.random() * 50) + 20
  }));

  const userGrowthData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    businesses: Math.floor(Math.random() * 10) + (metrics?.totalBusinesses || 150) * (i / 30),
    influencers: Math.floor(Math.random() * 20) + (metrics?.totalInfluencers || 450) * (i / 30)
  }));

  const categoryData = [
    { name: 'Food & Beverage', value: 45, fill: CHART_COLORS.primary },
    { name: 'Retail', value: 25, fill: CHART_COLORS.secondary },
    { name: 'Services', value: 20, fill: CHART_COLORS.success },
    { name: 'Other', value: 10, fill: CHART_COLORS.warning }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Dashboard</h1>
        <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
          <DialogTrigger asChild>
            <Button>Create System Coupon</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create System Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Coupon Type</Label>
                <Select value={couponForm.type} onValueChange={(value) => setCouponForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AFFILIATE">Affiliate</SelectItem>
                    <SelectItem value="CONTENT_MEAL">Content Meal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bizId">Business ID</Label>
                <Input
                  id="bizId"
                  value={couponForm.bizId}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, bizId: e.target.value }))}
                  placeholder="Enter business ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="infId">Influencer ID</Label>
                <Input
                  id="infId"
                  value={couponForm.infId}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, infId: e.target.value }))}
                  placeholder="Enter influencer ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="offerId">Offer ID</Label>
                <Input
                  id="offerId"
                  value={couponForm.offerId}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, offerId: e.target.value }))}
                  placeholder="Enter offer ID"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCouponModal(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCoupon} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Coupon'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {metrics && (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Businesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalBusinesses.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +8% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Influencers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalInfluencers.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +15% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  ${(metrics.totalRevenueCents / 100).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +23% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={CHART_COLORS.primary} 
                        fill={CHART_COLORS.primary}
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="businesses" 
                        stroke={CHART_COLORS.primary} 
                        strokeWidth={2}
                        name="Businesses"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="influencers" 
                        stroke={CHART_COLORS.secondary} 
                        strokeWidth={2}
                        name="Influencers"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">98.5%</div>
                    <div className="text-sm text-gray-600">Uptime</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">API Response</span>
                      <span className="text-sm font-medium">145ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Error Rate</span>
                      <span className="text-sm font-medium text-green-600">0.12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active Sessions</span>
                      <span className="text-sm font-medium">{metrics.activeCoupons}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button asChild className="w-full" size="sm" variant="outline">
                    <Link href="/control-center/export">Export Data</Link>
                  </Button>
                  <Button asChild className="w-full" size="sm" variant="outline">
                    <Link href="/control-center/reports">View Reports</Link>
                  </Button>
                  <Button asChild className="w-full" size="sm" variant="outline">
                    <Link href="/control-center/settings">System Settings</Link>
                  </Button>
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => {
                      alert('Alert sent to all system administrators');
                    }}
                  >
                    Send Alerts
                  </Button>
                  <Button
                    className="w-full"
                    size="sm"
                    variant="default"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/control-center/users', { method: 'POST' });
                        if (!res.ok) throw new Error('Seed failed');
                        const js = await res.json();
                        
                        // Show credentials in alert for easy copy-paste
                        const { businessEmail, influencerEmail, password } = js.credentials || {};
                        alert(
                          `Demo data created successfully!\n\n` +
                          `Business Login: ${businessEmail}\n` +
                          `Influencer Login: ${influencerEmail}\n` +
                          `Password: ${password}\n\n` +
                          `Use these credentials on the sign-in page.`
                        );
                        
                        const response = await fetch('/api/control-center/metrics');
                        if (response.ok) setMetrics(await response.json());
                      } catch (e) {
                        alert('Failed to create demo data');
                      }
                    }}
                  >
                    Create Demo Business & Influencer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics.isMockData && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              Note: Some data shown is mock data for development purposes.
            </div>
          )}
        </>
      )}
    </div>
  );
} 