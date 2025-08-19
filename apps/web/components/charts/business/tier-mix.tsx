'use client';

import { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV } from '../chart-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Award, Sparkles } from 'lucide-react';

interface TierData {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  influencer_count: number;
  revenue_cents: number;
  avg_revenue_per_influencer_cents: number;
  growth_rate: number;
  conversion_rate: number;
  retention_rate: number;
}

interface TierMixProps {
  bizId: string;
  className?: string;
}

type ViewMode = 'count' | 'revenue' | 'comparison';

export function TierMix({ bizId, className }: TierMixProps) {
  const [data, setData] = useState<TierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('revenue');

  // Generate mock tier data
  const generateMockData = (): TierData[] => {
    const tierBase = {
      Bronze: { multiplier: 1.0, count: 8 },
      Silver: { multiplier: 2.2, count: 5 },
      Gold: { multiplier: 4.5, count: 3 },
      Platinum: { multiplier: 8.0, count: 1 }
    };

    return Object.entries(tierBase).map(([tier, config]) => {
      const baseRevenue = 15000; // $150 base revenue per influencer
      const revenue_per_inf = Math.floor(baseRevenue * config.multiplier * (0.8 + Math.random() * 0.4));
      const influencer_count = config.count + Math.floor(Math.random() * 3); // Add some variance
      const total_revenue = revenue_per_inf * influencer_count;

      return {
        tier: tier as TierData['tier'],
        influencer_count,
        revenue_cents: total_revenue,
        avg_revenue_per_influencer_cents: revenue_per_inf,
        growth_rate: (Math.random() - 0.3) * 80, // -30% to +50% growth
        conversion_rate: 0.15 + (config.multiplier / 10) + Math.random() * 0.1, // Higher tiers convert better
        retention_rate: 0.6 + (config.multiplier / 20) + Math.random() * 0.2, // Higher tiers stick around longer
      };
    });
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/business/tier-mix?bizId=${bizId}
    setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 500);
  }, [bizId]);

  // Format functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  // Tier colors
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return '#8B5CF6'; // Purple
      case 'Gold': return '#F59E0B'; // Yellow
      case 'Silver': return '#6B7280'; // Gray
      case 'Bronze': return '#EA580C'; // Orange
      default: return '#9CA3AF';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Platinum': return <Sparkles className="w-4 h-4" />;
      case 'Gold': return <Award className="w-4 h-4" />;
      case 'Silver': return <TrendingUp className="w-4 h-4" />;
      case 'Bronze': return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  // Calculate totals and insights
  const totalInfluencers = data.reduce((sum, tier) => sum + tier.influencer_count, 0);
  const totalRevenue = data.reduce((sum, tier) => sum + tier.revenue_cents, 0);
  const avgRevenuePerInfluencer = totalInfluencers > 0 ? totalRevenue / totalInfluencers : 0;

  // Prepare chart data
  const pieData = data.map(tier => ({
    name: tier.tier,
    value: viewMode === 'count' ? tier.influencer_count : tier.revenue_cents,
    percentage: viewMode === 'count' 
      ? (tier.influencer_count / totalInfluencers) * 100
      : (tier.revenue_cents / totalRevenue) * 100,
    ...tier
  }));

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium mb-2">{data.tier} Tier</p>
          <div className="space-y-1 text-sm">
            <p>Influencers: {data.influencer_count}</p>
            <p>Revenue: {formatCurrency(data.revenue_cents)}</p>
            <p>Avg per Influencer: {formatCurrency(data.avg_revenue_per_influencer_cents)}</p>
            <p>Conversion: {formatPercentage(data.conversion_rate)}</p>
            <p>Growth: {formatGrowth(data.growth_rate)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Export functionality
  const handleExport = () => {
    const exportData = data.map(tier => ({
      Tier: tier.tier,
      'Influencer Count': tier.influencer_count,
      'Total Revenue': tier.revenue_cents / 100,
      'Avg Revenue per Influencer': tier.avg_revenue_per_influencer_cents / 100,
      'Conversion Rate': (tier.conversion_rate * 100).toFixed(1) + '%',
      'Growth Rate': formatGrowth(tier.growth_rate),
      'Retention Rate': (tier.retention_rate * 100).toFixed(1) + '%',
    }));
    exportToCSV(exportData, `tier-mix-${bizId}-${viewMode}`);
  };

  return (
    <ChartContainer
      title="Influencer Tier Mix"
      subtitle="Distribution and performance across influencer tiers"
      onExport={handleExport}
      metrics={[
        { label: 'Total Influencers', value: totalInfluencers.toString(), color: CHART_COLORS.primary },
        { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: CHART_COLORS.success },
        { label: 'Avg per Influencer', value: formatCurrency(avgRevenuePerInfluencer), color: CHART_COLORS.info },
      ]}
      actions={
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'revenue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('revenue')}
            className={viewMode === 'revenue' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            Revenue
          </Button>
          <Button
            variant={viewMode === 'count' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('count')}
            className={viewMode === 'count' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <Users className="w-3 h-3 mr-1" />
            Count
          </Button>
          <Button
            variant={viewMode === 'comparison' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('comparison')}
            className={viewMode === 'comparison' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Compare
          </Button>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading tier data...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {viewMode === 'comparison' ? (
            /* Comparison View - Bar Chart */
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => formatCurrency(value).replace('$', '$')}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Avg Revenue']}
                  labelFormatter={(label) => `${label} Tier`}
                />
                <Bar
                  dataKey="avg_revenue_per_influencer_cents"
                  fill={CHART_COLORS.primary}
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getTierColor(entry.tier)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* Pie Chart View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getTierColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend with details */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Tier Breakdown</h4>
                {data.map((tier, index) => (
                  <div key={tier.tier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getTierColor(tier.tier) }}
                      />
                      <div className="flex items-center gap-2">
                        {getTierIcon(tier.tier)}
                        <span className="font-medium">{tier.tier}</span>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div className="font-medium">
                        {viewMode === 'count' 
                          ? `${tier.influencer_count} influencers`
                          : formatCurrency(tier.revenue_cents)
                        }
                      </div>
                      <div className="text-gray-600">
                        {(viewMode === 'count' 
                          ? (tier.influencer_count / totalInfluencers) * 100
                          : (tier.revenue_cents / totalRevenue) * 100
                        ).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-4 gap-4">
            {data.map((tier) => (
              <Card key={tier.tier} className="border-l-4" style={{ borderLeftColor: getTierColor(tier.tier) }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getTierIcon(tier.tier)}
                    <span className="font-medium text-sm">{tier.tier}</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversion:</span>
                      <span className="font-medium">{formatPercentage(tier.conversion_rate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Retention:</span>
                      <span className="font-medium">{formatPercentage(tier.retention_rate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Growth:</span>
                      <span className={`font-medium ${tier.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatGrowth(tier.growth_rate)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Insights and Recommendations */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tier Insights</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {data.find(t => t.tier === 'Platinum')?.influencer_count || 0} Platinum influencers generate {formatPercentage((data.find(t => t.tier === 'Platinum')?.revenue_cents || 0) / totalRevenue)} of revenue</p>
                <p>• Gold+ tiers have {formatPercentage(data.filter(t => ['Gold', 'Platinum'].includes(t.tier)).reduce((sum, t) => sum + t.retention_rate, 0) / 2)} average retention</p>
                <p>• {data.filter(t => t.growth_rate > 0).length} tiers showing positive growth</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Focus on upgrading Silver influencers to Gold tier</p>
                <p>• Recruit more {data.reduce((best, tier) => tier.avg_revenue_per_influencer_cents > best.avg_revenue_per_influencer_cents ? tier : best).tier.toLowerCase()} tier influencers</p>
                <p>• Create retention programs for high-value tiers</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Switch between revenue and count views to see different perspectives
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Award className="w-3 h-3 mr-1" />
                Tier Management
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                <Sparkles className="w-3 h-3 mr-1" />
                Upgrade Program
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 