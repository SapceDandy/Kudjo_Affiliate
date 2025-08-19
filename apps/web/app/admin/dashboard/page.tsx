'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlobalKPIs } from '@/components/charts/admin/global-kpis';
import { LifecycleFunnel } from '@/components/charts/admin/lifecycle-funnel';
import { ExceptionMonitoring } from '@/components/charts/admin/exception-monitoring';
import { CouponsTable } from '@/components/admin/coupons-table';
import { 
  Shield, 
  Settings, 
  Download,
  Users,
  Building2,
  Activity,
  AlertTriangle,
  CheckCircle,
  Globe,
  BarChart3,
  Database,
  Bell,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Mock admin data
const mockAdmin = {
  name: 'Admin',
  email: 'admin@kudjo',
  role: 'Super Admin',
  lastLogin: new Date().toISOString(),
};

interface SystemStatus {
  component: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime: number;
  responseTime: number;
}

// Update the Metrics interface to make it compatible with AdminMetrics
type Metrics = {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenueCents: number;
  generatedAt?: string;
  isMockData?: boolean;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics from API
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/control-center/metrics', { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Fetched metrics:', data);
      
      setMetrics(data);
      setLoading(false);
    } catch (e: any) {
      console.error('Error fetching metrics:', e);
      setError(e?.message || 'Failed to load metrics');
      
      // Set fallback metrics if real ones fail
      setMetrics({
        totalUsers: 400,
        totalBusinesses: 200,
        totalInfluencers: 200,
        totalCoupons: 350,
        activeCoupons: 350,
        totalRedemptions: 880,
        totalRevenueCents: 4000000,
      });
      
      setLoading(false);
    }
  };
  
  useEffect(() => {
    let isMounted = true;
    
    // Generate mock system status
    const generateSystemStatus = () => {
      return [
        {
          component: 'API Gateway',
          status: 'operational' as const,
          uptime: 99.99,
          responseTime: 123,
        },
        {
          component: 'Database',
          status: 'operational' as const,
          uptime: 99.95,
          responseTime: 87,
        },
        {
          component: 'Auth Service',
          status: 'operational' as const,
          uptime: 100.00,
          responseTime: 45,
        },
        {
          component: 'Storage',
          status: 'operational' as const,
          uptime: 99.98,
          responseTime: 156,
        },
        {
          component: 'Background Jobs',
          status: 'operational' as const,
          uptime: 99.90,
          responseTime: 210,
        },
      ];
    };
    
    fetchMetrics();
    setSystemStatus(generateSystemStatus());
    
    return () => { isMounted = false; };
  }, []);

  // Format functions
  const formatCurrency = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format((cents || 0) / 100);
  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num || 0);

  const getStatusColor = (status: SystemStatus['status']) => {
    switch (status) {
      case 'operational': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'outage': return 'text-red-600';
    }
  };

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'outage': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: SystemStatus['status']) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'outage': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand text-white rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Platform Administration
            </h1>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Welcome back, {mockAdmin.name}</span>
              <Badge className="bg-purple-100 text-purple-800">
                {mockAdmin.role}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm"><Bell className="w-4 h-4 mr-2" />Alerts</Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />System Reports</Button>
          <Button variant="outline" size="sm"><Settings className="w-4 h-4 mr-2" />Platform Settings</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-8">
          {/* Platform Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-brand/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-blue-600 bg-blue-100 p-3 rounded-lg"><Users className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : formatNumber(metrics?.totalUsers || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-brand/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-green-600 bg-green-100 p-3 rounded-lg"><Database className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Platform Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : formatCurrency(metrics?.totalRevenueCents || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-brand/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-indigo-600 bg-indigo-100 p-3 rounded-lg"><Building2 className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Businesses</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : formatNumber(metrics?.totalBusinesses || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-brand/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-purple-600 bg-purple-100 p-3 rounded-lg"><Activity className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Active Coupons</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : formatNumber(metrics?.activeCoupons || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick KPI Preview */}
          <Card className="border-brand/20">
            <CardHeader>
              <CardTitle>Key Performance Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1">
                <GlobalKPIs metrics={metrics as any} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-8">
          <GlobalKPIs metrics={metrics as any} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <LifecycleFunnel />
            <ExceptionMonitoring />
          </div>
        </TabsContent>

        {/* Coupons */}
        <TabsContent value="coupons" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              Coupon Management
            </h2>
            <Button size="sm" className="bg-brand hover:bg-brand/90">
              Create System Coupon
            </Button>
          </div>
          <CouponsTable onCouponSelect={() => {}} />
        </TabsContent>

        {/* System */}
        <TabsContent value="system" className="space-y-8">
          {/* System Status Panel */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand" />
                System Component Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading system status...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {systemStatus.map((component) => (
                    <div key={component.component} className="p-4 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{component.component}</span>
                        {getStatusIcon(component.status)}
                      </div>
                      <Badge className={`text-xs mb-2 ${getStatusBadge(component.status)}`}>
                        {component.status}
                      </Badge>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Uptime:</span>
                          <span className="font-medium">{component.uptime.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Response:</span>
                          <span className="font-medium">{component.responseTime}ms</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <ExceptionMonitoring />
            </CardContent>
          </Card>

          {/* Emergency Contacts & Support */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="font-semibold text-red-900 mb-2">🚨 Emergency Support</h3>
                <p className="text-red-700 text-sm mb-4">For critical system issues requiring immediate attention</p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">📞 Emergency Hotline</Button>
                  <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">🔧 System Recovery</Button>
                  <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">📊 Incident Management</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools */}
        <TabsContent value="tools" className="space-y-8">
          {/* Admin Actions & Tools */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Administrative Tools
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-800">
                    <div>
                      <p className="font-medium">User Management:</p>
                      <ul className="space-y-1 text-purple-700">
                        <li>• Manage user accounts and permissions</li>
                        <li>• Bulk user operations and exports</li>
                        <li>• Account verification and KYC review</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Financial Operations:</p>
                      <ul className="space-y-1 text-purple-700">
                        <li>• Process and review payouts</li>
                        <li>• Monitor transaction patterns</li>
                        <li>• Generate financial reports</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Platform Controls:</p>
                      <ul className="space-y-1 text-purple-700">
                        <li>• Configure system parameters</li>
                        <li>• Manage fraud detection rules</li>
                        <li>• Deploy feature flags and updates</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">⚡ Quick Actions</h3>
                  <p className="text-gray-600 text-sm">Common administrative tasks and emergency controls</p>
                </div>
                <div className="flex gap-3">
                  <Button size="sm" className="bg-brand hover:bg-brand/90"><Users className="w-4 h-4 mr-2" />User Management</Button>
                  <Button variant="outline" size="sm"><Building2 className="w-4 h-4 mr-2" />Business Approvals</Button>
                  <Button variant="outline" size="sm"><Activity className="w-4 h-4 mr-2" />System Maintenance</Button>
                  <Button variant="outline" size="sm"><Database className="w-4 h-4 mr-2" />Data Export</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 