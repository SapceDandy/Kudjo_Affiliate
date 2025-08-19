'use client';

import { useState, useEffect } from 'react';
import { 
  ComposedChart, 
  Area,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV, DateRangePicker } from '../chart-container';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, DollarSign, Target, Calculator } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface ROASData {
  date: string;
  ad_spend_cents: number;
  coupon_revenue_cents: number;
  total_revenue_cents: number;
  roas: number;
  coupon_uses: number;
  conversion_rate: number;
}

interface ROASRevenueProps {
  bizId: string;
  className?: string;
}

type ChartView = 'revenue' | 'roas' | 'combined';

export function ROASRevenue({ bizId, className }: ROASRevenueProps) {
  const [data, setData] = useState<ROASData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [chartView, setChartView] = useState<ChartView>('combined');

  // Generate mock ROAS data
  const generateMockData = (days: number): ROASData[] => {
    const roasData: ROASData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      
      // Simulate varying ad spend and performance
      const dayOfWeek = subDays(new Date(), i).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseMultiplier = isWeekend ? 0.7 : 1.0;
      
      // Ad spend varies with some strategy changes
      const baseAdSpend = 15000 + Math.sin((i / days) * Math.PI * 4) * 5000; // $100-200/day base
      const ad_spend_cents = Math.floor(baseAdSpend * baseMultiplier * (0.8 + Math.random() * 0.4));
      
      // Coupon usage correlates with ad spend but has diminishing returns
      const efficiency = 0.3 + Math.random() * 0.4; // 30-70% efficiency
      const coupon_uses = Math.floor((ad_spend_cents / 1000) * efficiency); // Uses per $10 spent
      
      // Revenue per use varies by business performance
      const revenuePerUse = 2000 + Math.random() * 3000; // $20-50 per use
      const coupon_revenue_cents = coupon_uses * revenuePerUse;
      
      // Total revenue includes organic (non-coupon) sales
      const organicMultiplier = 1.5 + Math.random() * 1.0; // 1.5x-2.5x coupon revenue
      const total_revenue_cents = Math.floor(coupon_revenue_cents * organicMultiplier);
      
      // Calculate ROAS (Revenue / Ad Spend)
      const roas = ad_spend_cents > 0 ? total_revenue_cents / ad_spend_cents : 0;
      
      // Conversion rate (varies with targeting effectiveness)
      const conversion_rate = 0.15 + Math.random() * 0.25; // 15-40%
      
      roasData.push({
        date,
        ad_spend_cents,
        coupon_revenue_cents,
        total_revenue_cents,
        roas,
        coupon_uses,
        conversion_rate,
      });
    }
    
    return roasData;
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/business/roas?bizId=${bizId}&days=${dateRange}
    setTimeout(() => {
      setData(generateMockData(parseInt(dateRange)));
      setLoading(false);
    }, 800);
  }, [bizId, dateRange]);

  // Calculate summary metrics
  const totalAdSpend = data.reduce((sum, day) => sum + day.ad_spend_cents, 0);
  const totalCouponRevenue = data.reduce((sum, day) => sum + day.coupon_revenue_cents, 0);
  const totalRevenue = data.reduce((sum, day) => sum + day.total_revenue_cents, 0);
  const totalCouponUses = data.reduce((sum, day) => sum + day.coupon_uses, 0);
  const avgROAS = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
  const avgConversionRate = data.length > 0 ? data.reduce((sum, day) => sum + day.conversion_rate, 0) / data.length : 0;

  // Calculate trends
  const recentData = data.slice(-7);
  const previousData = data.slice(-14, -7);
  const recentROAS = recentData.length > 0 ? recentData.reduce((sum, day) => sum + day.roas, 0) / recentData.length : 0;
  const previousROAS = previousData.length > 0 ? previousData.reduce((sum, day) => sum + day.roas, 0) / previousData.length : 0;
  const roasTrend = previousROAS > 0 ? ((recentROAS - previousROAS) / previousROAS) * 100 : 0;

  // Format functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatROAS = (roas: number) => {
    return `${roas.toFixed(2)}x`;
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ROASData;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{format(parseISO(label), 'MMM dd, yyyy')}</p>
          <div className="space-y-1 text-sm">
            <p style={{ color: CHART_COLORS.danger }}>
              Ad Spend: {formatCurrency(data.ad_spend_cents)}
            </p>
            <p style={{ color: CHART_COLORS.warning }}>
              Coupon Revenue: {formatCurrency(data.coupon_revenue_cents)}
            </p>
            <p style={{ color: CHART_COLORS.success }}>
              Total Revenue: {formatCurrency(data.total_revenue_cents)}
            </p>
            <p style={{ color: CHART_COLORS.primary }}>
              ROAS: {formatROAS(data.roas)}
            </p>
            <p className="text-gray-600">
              Uses: {data.coupon_uses} | Conv: {formatPercentage(data.conversion_rate)}
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
      'Ad Spend': item.ad_spend_cents / 100,
      'Coupon Revenue': item.coupon_revenue_cents / 100,
      'Total Revenue': item.total_revenue_cents / 100,
      'ROAS': item.roas.toFixed(2),
      'Coupon Uses': item.coupon_uses,
      'Conversion Rate': (item.conversion_rate * 100).toFixed(1) + '%',
    }));
    exportToCSV(exportData, `roas-revenue-${bizId}-${dateRange}days`);
  };

  // Get ROAS performance indicator
  const getROASStatus = (roas: number) => {
    if (roas >= 4.0) return { label: 'Excellent', color: 'text-green-600' };
    if (roas >= 3.0) return { label: 'Good', color: 'text-blue-600' };
    if (roas >= 2.0) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Needs Improvement', color: 'text-red-600' };
  };

  const roasStatus = getROASStatus(avgROAS);

  return (
    <ChartContainer
      title="ROAS & Revenue Performance"
      subtitle="Track your advertising return on investment and revenue growth"
      onExport={handleExport}
      trend={{
        value: roasTrend,
        label: 'ROAS vs previous 7 days'
      }}
      metrics={[
        { label: 'Average ROAS', value: formatROAS(avgROAS), color: CHART_COLORS.primary },
        { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: CHART_COLORS.success },
        { label: 'Ad Spend', value: formatCurrency(totalAdSpend), color: CHART_COLORS.danger },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          
          <Select value={chartView} onValueChange={(value: ChartView) => setChartView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="combined">Combined</SelectItem>
              <SelectItem value="revenue">Revenue Only</SelectItem>
              <SelectItem value="roas">ROAS Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading ROAS data...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Performance Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">Avg ROAS</div>
              <div className={`text-lg font-semibold ${roasStatus.color}`}>
                {formatROAS(avgROAS)}
              </div>
              <div className="text-xs text-blue-600">{roasStatus.label}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">Revenue/Spend</div>
              <div className="text-lg font-semibold text-green-900">
                {totalAdSpend > 0 ? formatPercentage(totalRevenue / totalAdSpend) : '0%'}
              </div>
              <div className="text-xs text-green-600">efficiency</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-700">Coupon Uses</div>
              <div className="text-lg font-semibold text-purple-900">{totalCouponUses}</div>
              <div className="text-xs text-purple-600">total conversions</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-700">Conversion Rate</div>
              <div className="text-lg font-semibold text-orange-900">
                {formatPercentage(avgConversionRate)}
              </div>
              <div className="text-xs text-orange-600">average</div>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
              />
              <YAxis 
                yAxisId="currency"
                orientation="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatCurrency(value).replace('$', '$')}
              />
              <YAxis 
                yAxisId="roas"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value.toFixed(1)}x`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Revenue components */}
              {(chartView === 'combined' || chartView === 'revenue') && (
                <>
                  <Bar
                    yAxisId="currency"
                    dataKey="ad_spend_cents"
                    fill={CHART_COLORS.danger}
                    fillOpacity={0.8}
                    name="Ad Spend"
                  />
                  <Area
                    yAxisId="currency"
                    type="monotone"
                    dataKey="total_revenue_cents"
                    fill={CHART_COLORS.success}
                    fillOpacity={0.3}
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    name="Total Revenue"
                  />
                </>
              )}

              {/* ROAS line */}
              {(chartView === 'combined' || chartView === 'roas') && (
                <Line
                  yAxisId="roas"
                  type="monotone"
                  dataKey="roas"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                  name="ROAS"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Performance Insights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Performance Insights</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {avgROAS >= 3.0 ? '🎯 Strong ROAS performance!' : avgROAS >= 2.0 ? '📈 ROAS is improving' : '⚠️ ROAS needs optimization'}</p>
                <p>• Best performing days: {data.filter(d => d.roas >= avgROAS * 1.2).length} days above average</p>
                <p>• {avgConversionRate >= 0.25 ? 'Excellent' : avgConversionRate >= 0.20 ? 'Good' : 'Fair'} conversion rate at {formatPercentage(avgConversionRate)}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Optimization Tips</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {avgROAS < 3.0 ? 'Consider reducing ad spend or improving targeting' : 'Current ad strategy is performing well'}</p>
                <p>• {totalCouponUses < data.length * 5 ? 'Increase coupon promotion visibility' : 'Strong coupon adoption'}</p>
                <p>• Weekend performance could be optimized with targeted campaigns</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Hover chart to see daily breakdown | Target ROAS: 3.0x+
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calculator className="w-3 h-3 mr-1" />
                ROI Calculator
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                <Target className="w-3 h-3 mr-1" />
                Optimize Campaign
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 