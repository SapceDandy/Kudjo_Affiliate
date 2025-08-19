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
  ReferenceLine
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV, DateRangePicker } from '../chart-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Calendar } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface PerformanceData {
  date: string;
  affiliate_uses: number;
  content_meal_uses: number;
  total_uses: number;
  target_uses?: number;
}

interface CouponPerformanceProps {
  infId: string;
  className?: string;
}

export function CouponPerformance({ infId, className }: CouponPerformanceProps) {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [showTarget, setShowTarget] = useState(true);

  // Generate mock performance data
  const generateMockData = (days: number): PerformanceData[] => {
    const performanceData: PerformanceData[] = [];
    const targetUsesPerDay = 8; // Target 8 uses per day
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      
      // Simulate varying performance with weekends being lower
      const dayOfWeek = subDays(new Date(), i).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseMultiplier = isWeekend ? 0.6 : 1.0;
      
      // Add some seasonality and randomness
      const seasonalMultiplier = 0.8 + Math.sin((i / days) * Math.PI * 2) * 0.3;
      const randomMultiplier = 0.7 + Math.random() * 0.6;
      
      const totalMultiplier = baseMultiplier * seasonalMultiplier * randomMultiplier;
      
      const affiliate_uses = Math.floor((Math.random() * 8 + 2) * totalMultiplier);
      const content_meal_uses = Math.floor((Math.random() * 6 + 1) * totalMultiplier);
      
      performanceData.push({
        date,
        affiliate_uses,
        content_meal_uses,
        total_uses: affiliate_uses + content_meal_uses,
        target_uses: targetUsesPerDay,
      });
    }
    
    return performanceData;
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/influencer/coupon-performance?infId=${infId}&days=${dateRange}
    setTimeout(() => {
      setData(generateMockData(parseInt(dateRange)));
      setLoading(false);
    }, 700);
  }, [infId, dateRange]);

  // Calculate summary metrics
  const totalAffiliateUses = data.reduce((sum, day) => sum + day.affiliate_uses, 0);
  const totalContentUses = data.reduce((sum, day) => sum + day.content_meal_uses, 0);
  const totalUses = totalAffiliateUses + totalContentUses;
  const targetTotal = data.reduce((sum, day) => sum + (day.target_uses || 0), 0);
  const targetAchievement = targetTotal > 0 ? (totalUses / targetTotal) * 100 : 0;

  // Calculate averages
  const avgDaily = data.length > 0 ? totalUses / data.length : 0;
  const avgTarget = data.length > 0 ? targetTotal / data.length : 0;

  // Calculate trends
  const recentData = data.slice(-7);
  const previousData = data.slice(-14, -7);
  const recentUses = recentData.reduce((sum, day) => sum + day.total_uses, 0);
  const previousUses = previousData.reduce((sum, day) => sum + day.total_uses, 0);
  const trend = previousUses > 0 ? ((recentUses - previousUses) / previousUses) * 100 : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PerformanceData;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium mb-2">{format(parseISO(label), 'MMM dd, yyyy')}</p>
          <div className="space-y-1 text-sm">
            <p style={{ color: CHART_COLORS.secondary }}>
              Affiliate: {data.affiliate_uses} uses
            </p>
            <p style={{ color: CHART_COLORS.pink }}>
              Content Meal: {data.content_meal_uses} uses
            </p>
            <p className="font-medium">
              Total: {data.total_uses} uses
            </p>
            {data.target_uses && (
              <p className="text-gray-600">
                Target: {data.target_uses} uses
              </p>
            )}
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
      'Affiliate Uses': item.affiliate_uses,
      'Content Meal Uses': item.content_meal_uses,
      'Total Uses': item.total_uses,
      'Target Uses': item.target_uses || 0,
      'Achievement %': item.target_uses ? ((item.total_uses / item.target_uses) * 100).toFixed(1) : 0,
    }));
    exportToCSV(exportData, `coupon-performance-${infId}-${dateRange}days`);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <ChartContainer
      title="Coupon Performance"
      subtitle="Daily usage breakdown by coupon type"
      onExport={handleExport}
      trend={{
        value: trend,
        label: 'vs previous 7 days'
      }}
      metrics={[
        { label: 'Affiliate', value: formatNumber(totalAffiliateUses), color: CHART_COLORS.secondary },
        { label: 'Content Meal', value: formatNumber(totalContentUses), color: CHART_COLORS.pink },
        { label: 'Target Achievement', value: `${targetAchievement.toFixed(1)}%`, color: CHART_COLORS.success },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          
          <Button
            variant={showTarget ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowTarget(!showTarget)}
            className={showTarget ? 'bg-brand hover:bg-brand/90' : ''}
          >
            <Target className="w-3 h-3 mr-1" />
            Target
          </Button>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading performance data...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Performance Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">Daily Average</div>
              <div className="text-lg font-semibold text-blue-900">{avgDaily.toFixed(1)}</div>
              <div className="text-xs text-blue-600">uses per day</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">Target Rate</div>
              <div className="text-lg font-semibold text-green-900">{targetAchievement.toFixed(0)}%</div>
              <div className="text-xs text-green-600">achievement</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-700">Affiliate Split</div>
              <div className="text-lg font-semibold text-orange-900">
                {totalUses > 0 ? ((totalAffiliateUses / totalUses) * 100).toFixed(0) : 0}%
              </div>
              <div className="text-xs text-orange-600">of total uses</div>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
              <div className="text-sm text-pink-700">Content Split</div>
              <div className="text-lg font-semibold text-pink-900">
                {totalUses > 0 ? ((totalContentUses / totalUses) * 100).toFixed(0) : 0}%
              </div>
              <div className="text-xs text-pink-600">of total uses</div>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Target line */}
              {showTarget && (
                <ReferenceLine 
                  y={avgTarget} 
                  stroke={CHART_COLORS.gray} 
                  strokeDasharray="5 5"
                  label={{ value: "Target", position: "top" }}
                />
              )}
              
              <Bar
                dataKey="affiliate_uses"
                stackId="coupon"
                fill={CHART_COLORS.secondary}
                name="Affiliate Uses"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="content_meal_uses"
                stackId="coupon"
                fill={CHART_COLORS.pink}
                name="Content Meal Uses"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Performance Insights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Performance Insights</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {targetAchievement >= 100 ? '🎯 Exceeding daily targets!' : targetAchievement >= 80 ? '💪 Close to targets' : '📈 Room for improvement'}</p>
                <p>• Best performing days: {data.filter(d => d.total_uses >= avgDaily * 1.2).length} days above average</p>
                <p>• {totalAffiliateUses > totalContentUses ? 'Affiliate coupons' : 'Content meal coupons'} are your primary driver</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Recommendations</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {targetAchievement < 80 ? 'Increase content posting frequency' : 'Maintain current posting schedule'}</p>
                <p>• {totalContentUses < totalAffiliateUses * 0.5 ? 'Focus on more content meal promotions' : 'Good content meal balance'}</p>
                <p>• Weekend performance could be improved with targeted content</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Hover chart bars to see daily breakdown
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="w-3 h-3 mr-1" />
                Schedule Content
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                View Content Calendar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 