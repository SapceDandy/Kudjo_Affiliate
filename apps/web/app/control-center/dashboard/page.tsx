'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Activity,
  Download,
  Search,
  Filter,
  UserCheck,
  UserX,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

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

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'influencer' | 'business';
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  handle?: string;
  followers?: number;
  businessName?: string;
  industry?: string;
}

interface CouponFormData {
  type: string;
  bizId: string;
  infId: string;
}

interface ExportFormData {
  type: 'users' | 'businesses' | 'influencers' | 'redemptions' | 'coupons' | 'metrics';
  format: 'csv' | 'json';
  dateFrom?: string;
  dateTo?: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [couponForm, setCouponForm] = useState<CouponFormData>({
    type: 'AFFILIATE',
    bizId: '',
    infId: ''
  });
  const [exportForm, setExportForm] = useState<ExportFormData>({
    type: 'users',
    format: 'csv'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [metricsResponse, usersResponse] = await Promise.all([
          fetch('/api/admin/metrics'),
          fetch('/api/admin/users?limit=50')
        ]);
        
        if (!metricsResponse.ok) {
          throw new Error(`Failed to fetch metrics: ${metricsResponse.status}`);
        }
        
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const fetchUsers = async (filters?: { role?: string; status?: string; q?: string }) => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams();
      if (filters?.role && filters.role !== 'all') params.set('role', filters.role);
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters?.q) params.set('q', filters.q);
      params.set('limit', '50');
      
      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponForm.bizId || !couponForm.infId) {
      toast.error('Please fill in all required fields');
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
      toast.success(`Coupon created: ${created.couponId} (code: ${created.code})`);
      
      // Reset form and close modal
      setCouponForm({ type: 'AFFILIATE', bizId: '', infId: '' });
      setShowCouponModal(false);
      
      // Refresh metrics
      const response = await fetch('/api/admin/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err: any) {
      toast.error(`Create failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportForm.type,
          format: exportForm.format,
          filters: {
            dateFrom: exportForm.dateFrom,
            dateTo: exportForm.dateTo,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (exportForm.format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportForm.type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Export downloaded successfully');
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportForm.type}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Export downloaded successfully');
      }
      
      setShowExportModal(false);
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUserStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/control-center/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, updates: { status: newStatus } }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      toast.success(`User status updated to ${newStatus}`);
      fetchUsers({ role: roleFilter, status: statusFilter, q: searchTerm });
    } catch (err: any) {
      toast.error(`Failed to update user: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleSearch = () => {
    fetchUsers({ role: roleFilter, status: statusFilter, q: searchTerm });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.handle && user.handle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.businessName && user.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

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
        <h1 className="text-3xl font-bold">Admin Control Center</h1>
        <div className="flex gap-2">
          <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Export Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Type</Label>
                  <Select value={exportForm.type} onValueChange={(value: any) => setExportForm(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">All Users</SelectItem>
                      <SelectItem value="businesses">Businesses</SelectItem>
                      <SelectItem value="influencers">Influencers</SelectItem>
                      <SelectItem value="redemptions">Redemptions</SelectItem>
                      <SelectItem value="coupons">Coupons</SelectItem>
                      <SelectItem value="metrics">System Metrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={exportForm.format} onValueChange={(value: any) => setExportForm(prev => ({ ...prev, format: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={exportForm.dateFrom || ''}
                      onChange={(e) => setExportForm(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={exportForm.dateTo || ''}
                      onChange={(e) => setExportForm(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowExportModal(false)} disabled={isExporting}>
                    Cancel
                  </Button>
                  <Button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
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

          {/* User Management Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">User Management</h2>
              <div className="flex gap-2">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="influencer">Influencers</SelectItem>
                    <SelectItem value="business">Businesses</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={usersLoading}>
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.slice(0, 10).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.displayName}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {user.handle && <div className="text-sm text-blue-600">{user.handle}</div>}
                              {user.businessName && <div className="text-sm text-purple-600">{user.businessName}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'influencer' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                            {user.followers && (
                              <div className="text-xs text-gray-500 mt-1">
                                {user.followers.toLocaleString()} followers
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.status === 'active' ? 'default' : user.status === 'pending' ? 'secondary' : 'destructive'}
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {user.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserStatusChange(user.id, 'active')}
                                >
                                  <UserCheck className="w-3 h-3" />
                                </Button>
                              )}
                              {user.status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserStatusChange(user.id, 'suspended')}
                                >
                                  <UserX className="w-3 h-3" />
                                </Button>
                              )}
                              {user.status === 'suspended' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserStatusChange(user.id, 'active')}
                                >
                                  <UserCheck className="w-3 h-3" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost">
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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