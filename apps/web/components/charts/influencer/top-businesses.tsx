'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV } from '../chart-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, DollarSign, Zap } from 'lucide-react';

interface BusinessData {
  businessName: string;
  businessId: string;
  revenue_cents: number;
  payout_cents: number;
  conversions: number;
  orders: number;
  logo?: string;
}

interface TopBusinessesProps {
  infId: string;
  className?: string;
}

type MetricType = 'revenue' | 'payout' | 'conversions';

export function TopBusinesses({ infId, className }: TopBusinessesProps) {
  const [data, setData] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>('revenue');

  // Generate mock data
  const generateMockData = (): BusinessData[] => {
    const businesses = [
      'The Golden Spoon', 'Urban Eats', 'Cafe Nouveau', 'Burger Palace', 
      'Sushi Zen', 'Pizza Corner', 'Taco Libre', 'Green Bowl', 
      'Steakhouse Prime', 'Noodle House'
    ];

    return businesses.map((name, index) => {
      const revenue_cents = Math.floor(Math.random() * 50000) + 10000; // $100-$600
      const conversionRate = 0.15 + Math.random() * 0.25; // 15-40%
      const orders = Math.floor(Math.random() * 50) + 10;
      
      return {
        businessName: name,
        businessId: `biz_${index}`,
        revenue_cents,
        payout_cents: Math.floor(revenue_cents * conversionRate),
        conversions: orders,
        orders: Math.floor(orders * 1.2), // Some additional orders without conversions
      };
    }).sort((a, b) => {
      switch (metric) {
        case 'revenue': return b.revenue_cents - a.revenue_cents;
        case 'payout': return b.payout_cents - a.payout_cents;
        case 'conversions': return b.conversions - a.conversions;
        default: return 0;
      }
    }).slice(0, 10); // Top 10
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/influencer/top-businesses?infId=${infId}&metric=${metric}&days=30
    setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 600);
  }, [infId, metric]);

  // Format functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Get metric-specific data
  const getMetricValue = (item: BusinessData) => {
    switch (metric) {
      case 'revenue': return item.revenue_cents;
      case 'payout': return item.payout_cents;
      case 'conversions': return item.conversions;
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue': return 'Revenue';
      case 'payout': return 'Payout';
      case 'conversions': return 'Conversions';
    }
  };

  const getMetricColor = () => {
    switch (metric) {
      case 'revenue': return CHART_COLORS.primary;
      case 'payout': return CHART_COLORS.success;
      case 'conversions': return CHART_COLORS.info;
    }
  };

  const getMetricFormatter = () => {
    switch (metric) {
      case 'revenue':
      case 'payout':
        return formatCurrency;
      case 'conversions':
        return formatNumber;
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && payload[0].payload) {
      const data = payload[0].payload as BusinessData;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{data.businessName}</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-600">Revenue:</span> {formatCurrency(data.revenue_cents)}</p>
            <p><span className="text-gray-600">Payout:</span> {formatCurrency(data.payout_cents)}</p>
            <p><span className="text-gray-600">Conversions:</span> {formatNumber(data.conversions)}</p>
            <p><span className="text-gray-600">Total Orders:</span> {formatNumber(data.orders)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Export functionality
  const handleExport = () => {
    const exportData = data.map(item => ({
      Business: item.businessName,
      Revenue: item.revenue_cents / 100,
      Payout: item.payout_cents / 100,
      Conversions: item.conversions,
      Orders: item.orders,
      'Conversion Rate': ((item.conversions / item.orders) * 100).toFixed(1) + '%',
    }));
    exportToCSV(exportData, `top-businesses-${infId}-${metric}`);
  };

  // Handle business click for drill-down
  const handleBusinessClick = (data: any) => {
    if (data && data.businessId) {
      console.log('Navigate to business detail:', data.businessId);
      // Router navigation would go here
    }
  };

  // Calculate summary stats
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue_cents, 0);
  const totalPayout = data.reduce((sum, item) => sum + item.payout_cents, 0);
  const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0);

  return (
    <ChartContainer
      title="Top Businesses by Performance"
      subtitle="Your most valuable partnerships this month"
      onExport={handleExport}
      metrics={[
        { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: CHART_COLORS.primary },
        { label: 'Total Payout', value: formatCurrency(totalPayout), color: CHART_COLORS.success },
        { label: 'Conversions', value: formatNumber(totalConversions), color: CHART_COLORS.info },
      ]}
      actions={
        <div className="flex gap-1">
          <Button
            variant={metric === 'revenue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMetric('revenue')}
            className={metric === 'revenue' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Revenue
          </Button>
          <Button
            variant={metric === 'payout' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMetric('payout')}
            className={metric === 'payout' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Payout
          </Button>
          <Button
            variant={metric === 'conversions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMetric('conversions')}
            className={metric === 'conversions' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <Zap className="w-3 h-3 mr-1" />
            Conversions
          </Button>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading business data...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              layout="horizontal"
              data={data}
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={getMetricFormatter()}
              />
              <YAxis 
                type="category"
                dataKey="businessName"
                tick={{ fontSize: 11 }}
                width={75}
                tickFormatter={(name) => name.length > 12 ? name.substring(0, 10) + '...' : name}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={metric === 'revenue' ? 'revenue_cents' : metric === 'payout' ? 'payout_cents' : 'conversions'}
                fill={getMetricColor()}
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={handleBusinessClick}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index < 3 ? getMetricColor() : `${getMetricColor()}99`} // Top 3 highlighted
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Business List with Additional Details */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Top Performers</h4>
            <div className="space-y-2">
              {data.slice(0, 5).map((business, index) => (
                <div key={business.businessId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{business.businessName}</div>
                      <div className="text-sm text-gray-600">
                        {business.conversions} conversions from {business.orders} orders
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{getMetricFormatter()(getMetricValue(business))}</div>
                    <div className="text-sm text-gray-600">
                      {((business.conversions / business.orders) * 100).toFixed(1)}% conversion rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Click businesses to view detailed performance
            </div>
            <Button variant="outline" size="sm">
              View All Partnerships
            </Button>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 