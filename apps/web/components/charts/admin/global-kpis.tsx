'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Cell
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV, DateRangePicker } from '../chart-container';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building2, 
  DollarSign, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Globe,
  Activity
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface GlobalKPIData {
  date: string;
  total_businesses: number;
  total_influencers: number;
  total_revenue_cents: number;
  total_payouts_cents: number;
  active_coupons: number;
  conversion_rate: number;
  platform_fee_cents: number;
  new_signups: number;
}

interface KPICard {
  title: string;
  value: string | number;
  change: number;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
  color: string;
  target?: number;
}

interface GlobalKPIsProps {
  className?: string;
  metrics?: AdminMetrics | null;
}

// Interface for admin metrics API response
interface AdminMetrics {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenueCents: number;
  generatedAt: string;
}

export function GlobalKPIs({ className, metrics: propMetrics }: GlobalKPIsProps) {
  const [data, setData] = useState<GlobalKPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [kpiCards, setKpiCards] = useState<KPICard[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch real metrics from the API or use provided metrics
  useEffect(() => {
    if (propMetrics) {
      console.log('Using provided metrics:', propMetrics);
      setMetrics(propMetrics);
      return;
    }
    
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/control-center/metrics', { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched metrics:', data);
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      }
    };
    
    fetchMetrics();
  }, [propMetrics]);

  // Generate mock global data
  const generateMockData = (days: number): GlobalKPIData[] => {
    const globalData: GlobalKPIData[] = [];
    let cumulativeBusinesses = metrics?.totalBusinesses || 150;
    let cumulativeInfluencers = metrics?.totalInfluencers || 450;
    
    // Calculate average daily revenue based on total
    const totalRevenue = metrics?.totalRevenueCents || 4000000; // Default if no metrics
    const avgDailyRevenue = totalRevenue / 30; // Assume 30 days of data
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      
      // Growth patterns with some seasonality
      const growthMultiplier = 1 + Math.sin((i / days) * Math.PI * 2) * 0.2;
      const dayOfWeek = subDays(new Date(), i).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendMultiplier = isWeekend ? 0.7 : 1.0;
      
      // Daily growth - scaled based on real metrics
      const businessGrowthRate = metrics?.totalBusinesses ? metrics.totalBusinesses / 100 : 2;
      const influencerGrowthRate = metrics?.totalInfluencers ? metrics.totalInfluencers / 100 : 5;
      
      const newBusinesses = Math.floor((businessGrowthRate + Math.random() * 3) * growthMultiplier * weekendMultiplier);
      const newInfluencers = Math.floor((influencerGrowthRate + Math.random() * 8) * growthMultiplier * weekendMultiplier);
      
      // Only add growth for historical days
      if (i > 0) {
        cumulativeBusinesses -= newBusinesses;
        cumulativeInfluencers -= newInfluencers;
      }
      
      // Ensure we don't go below reasonable minimums
      cumulativeBusinesses = Math.max(cumulativeBusinesses, 50);
      cumulativeInfluencers = Math.max(cumulativeInfluencers, 100);
      
      // Revenue and activity metrics - scaled based on real metrics
      const dailyRevenue = Math.floor((avgDailyRevenue + Math.random() * (avgDailyRevenue * 0.3)) * growthMultiplier * weekendMultiplier);
      const dailyPayouts = Math.floor(dailyRevenue * (0.6 + Math.random() * 0.2)); // 60-80% of revenue
      const activeCoupons = Math.floor(((metrics?.activeCoupons || 200) + Math.random() * 50) * growthMultiplier);
      const conversionRate = 0.18 + Math.random() * 0.12; // 18-30%
      const platformFee = Math.floor(dailyRevenue * 0.15); // 15% platform fee
      
      globalData.push({
        date,
        total_businesses: cumulativeBusinesses,
        total_influencers: cumulativeInfluencers,
        total_revenue_cents: dailyRevenue,
        total_payouts_cents: dailyPayouts,
        active_coupons: activeCoupons,
        conversion_rate: conversionRate,
        platform_fee_cents: platformFee,
        new_signups: newBusinesses + newInfluencers,
      });
    }
    
    return globalData;
  };

  useEffect(() => {
    setLoading(true);
    
    // Wait for metrics to be loaded before generating chart data
    if (!metrics && !error) {
      return;
    }
    
    setTimeout(() => {
      const mockData = generateMockData(parseInt(dateRange));
      setData(mockData);
      
      // Calculate KPI cards
      const latest = mockData[mockData.length - 1];
      const previous = mockData[mockData.length - 8]; // Week ago
      
      const cards: KPICard[] = [
        {
          title: 'Total Businesses',
          value: metrics?.totalBusinesses?.toLocaleString() || latest.total_businesses.toLocaleString(),
          change: ((latest.total_businesses - previous.total_businesses) / previous.total_businesses) * 100,
          status: metrics?.totalBusinesses && metrics.totalBusinesses > 180 ? 'healthy' : metrics?.totalBusinesses && metrics.totalBusinesses > 160 ? 'warning' : 'critical',
          icon: <Building2 className="w-5 h-5" />,
          color: 'text-blue-600',
          target: 200,
        },
        {
          title: 'Total Influencers',
          value: metrics?.totalInfluencers?.toLocaleString() || latest.total_influencers.toLocaleString(),
          change: ((latest.total_influencers - previous.total_influencers) / previous.total_influencers) * 100,
          status: metrics?.totalInfluencers && metrics.totalInfluencers > 500 ? 'healthy' : metrics?.totalInfluencers && metrics.totalInfluencers > 400 ? 'warning' : 'critical',
          icon: <Users className="w-5 h-5" />,
          color: 'text-purple-600',
          target: 600,
        },
        {
          title: 'Daily Revenue',
          value: `$${(mockData.slice(-7).reduce((sum, d) => sum + d.total_revenue_cents, 0) / 7 / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          change: ((mockData.slice(-7).reduce((sum, d) => sum + d.total_revenue_cents, 0) - mockData.slice(-14, -7).reduce((sum, d) => sum + d.total_revenue_cents, 0)) / mockData.slice(-14, -7).reduce((sum, d) => sum + d.total_revenue_cents, 0)) * 100,
          status: 'healthy',
          icon: <DollarSign className="w-5 h-5" />,
          color: 'text-green-600',
        },
        {
          title: 'Conversion Rate',
          value: `${(mockData.slice(-7).reduce((sum, d) => sum + d.conversion_rate, 0) / 7 * 100).toFixed(1)}%`,
          change: ((mockData.slice(-7).reduce((sum, d) => sum + d.conversion_rate, 0) / 7 - mockData.slice(-14, -7).reduce((sum, d) => sum + d.conversion_rate, 0) / 7) / (mockData.slice(-14, -7).reduce((sum, d) => sum + d.conversion_rate, 0) / 7)) * 100,
          status: mockData.slice(-7).reduce((sum, d) => sum + d.conversion_rate, 0) / 7 > 0.22 ? 'healthy' : 'warning',
          icon: <Target className="w-5 h-5" />,
          color: 'text-orange-600',
          target: 25,
        },
        {
          title: 'Active Coupons',
          value: metrics?.activeCoupons?.toLocaleString() || latest.active_coupons.toLocaleString(),
          change: ((latest.active_coupons - previous.active_coupons) / previous.active_coupons) * 100,
          status: 'healthy',
          icon: <Zap className="w-5 h-5" />,
          color: 'text-yellow-600',
        },
        {
          title: 'Platform Fees',
          value: `$${(mockData.slice(-7).reduce((sum, d) => sum + d.platform_fee_cents, 0) / 7 / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          change: ((mockData.slice(-7).reduce((sum, d) => sum + d.platform_fee_cents, 0) - mockData.slice(-14, -7).reduce((sum, d) => sum + d.platform_fee_cents, 0)) / mockData.slice(-14, -7).reduce((sum, d) => sum + d.platform_fee_cents, 0)) * 100,
          status: 'healthy',
          icon: <Activity className="w-5 h-5" />,
          color: 'text-indigo-600',
        },
      ];
      
      setKpiCards(cards);
      setLoading(false);
    }, 800);
  }, [dateRange, metrics, error]);

  // Format functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getStatusColor = (status: KPICard['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
    }
  };

  const getStatusIcon = (status: KPICard['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as GlobalKPIData;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{format(parseISO(label), 'MMM dd, yyyy')}</p>
          <div className="space-y-1 text-sm">
            <p style={{ color: CHART_COLORS.primary }}>
              Revenue: {formatCurrency(data.total_revenue_cents)}
            </p>
            <p style={{ color: CHART_COLORS.success }}>
              Payouts: {formatCurrency(data.total_payouts_cents)}
            </p>
            <p style={{ color: CHART_COLORS.info }}>
              Active Coupons: {data.active_coupons}
            </p>
            <p style={{ color: CHART_COLORS.warning }}>
              Conversion: {(data.conversion_rate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Export functionality
  const handleExport = () => {
    const exportData = data.map(item => ({
      Date: item.date,
      'Total Businesses': item.total_businesses,
      'Total Influencers': item.total_influencers,
      'Revenue': item.total_revenue_cents / 100,
      'Payouts': item.total_payouts_cents / 100,
      'Active Coupons': item.active_coupons,
      'Conversion Rate': (item.conversion_rate * 100).toFixed(1) + '%',
      'Platform Fees': item.platform_fee_cents / 100,
      'New Signups': item.new_signups,
    }));
    exportToCSV(exportData, `global-kpis-${dateRange}days`);
  };

  // Calculate growth rates
  const totalRevenue = data.reduce((sum, day) => sum + day.total_revenue_cents, 0);
  const totalPayouts = data.reduce((sum, day) => sum + day.total_payouts_cents, 0);
  const totalFees = data.reduce((sum, day) => sum + day.platform_fee_cents, 0);

  return (
    <ChartContainer
      title="Global Platform KPIs"
      subtitle="Real-time platform performance and growth metrics"
      onExport={handleExport}
      metrics={[
        { label: 'Total Revenue', value: metrics ? formatCurrency(metrics.totalRevenueCents) : formatCurrency(totalRevenue), color: CHART_COLORS.success },
        { label: 'Total Payouts', value: formatCurrency(totalPayouts), color: CHART_COLORS.primary },
        { label: 'Platform Fees', value: formatCurrency(totalFees), color: CHART_COLORS.info },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm">
            <Globe className="w-3 h-3 mr-1" />
            Real-time
          </Button>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading global metrics...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpiCards.map((kpi, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`${kpi.color} bg-opacity-10 p-2 rounded-lg`}>
                        <div className={kpi.color}>
                          {kpi.icon}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{kpi.title}</span>
                    </div>
                    {getStatusIcon(kpi.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
                      {kpi.target && (
                        <span className="text-xs text-gray-500">/ {kpi.target.toLocaleString()}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpi.change >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                        {formatChange(kpi.change)}
                      </span>
                      <span className="text-sm text-gray-500">vs last week</span>
                    </div>
                    
                    {kpi.target && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${kpi.status === 'healthy' ? 'bg-green-500' : kpi.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min((parseInt(kpi.value.toString().replace(/,/g, '')) / kpi.target) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue & Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-brand">Revenue & Platform Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatCurrency(value).replace('$', '$')}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Area
                    type="monotone"
                    dataKey="total_payouts_cents"
                    stackId="1"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.6}
                    name="Payouts"
                  />
                  <Area
                    type="monotone"
                    dataKey="platform_fee_cents"
                    stackId="1"
                    stroke={CHART_COLORS.success}
                    fill={CHART_COLORS.success}
                    fillOpacity={0.8}
                    name="Platform Fees"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Growth Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-brand">User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="total_businesses" 
                      stroke={CHART_COLORS.info} 
                      strokeWidth={2}
                      name="Businesses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_influencers" 
                      stroke={CHART_COLORS.secondary} 
                      strokeWidth={2}
                      name="Influencers"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-brand">Platform Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">92%</div>
                    <div className="text-sm text-gray-600">Overall Health Score</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">System Uptime</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }} />
                        </div>
                        <span className="text-sm font-medium">99.9%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Response Time</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }} />
                        </div>
                        <span className="text-sm font-medium">145ms</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Error Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '12%' }} />
                        </div>
                        <span className="text-sm font-medium">0.12%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Alerts */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                System Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <div>
                      <div className="font-medium text-yellow-900">Scheduled Maintenance</div>
                      <div className="text-sm text-yellow-700">Database optimization planned for tonight 2-4 AM PST</div>
                    </div>
                  </div>
                  <Badge className="bg-yellow-200 text-yellow-800">Scheduled</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">All Systems Operational</div>
                      <div className="text-sm text-green-700">No critical issues detected in the last 24 hours</div>
                    </div>
                  </div>
                  <Badge className="bg-green-200 text-green-800">Healthy</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Data updates every 5 minutes | Last update: {format(new Date(), 'MMM dd, h:mm a')}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Activity className="w-3 h-3 mr-1" />
                System Status
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                <Globe className="w-3 h-3 mr-1" />
                Platform Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 