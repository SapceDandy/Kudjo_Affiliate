'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FunnelChart, 
  Funnel, 
  LabelList,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV } from '../chart-container';
import { 
  Users, 
  UserCheck, 
  Target, 
  Zap,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Percent,
  Clock
} from 'lucide-react';

interface FunnelStage {
  name: string;
  value: number;
  fill: string;
  conversionRate?: number;
  dropoffRate?: number;
  stage: 'signup' | 'onboarded' | 'first_coupon' | 'first_conversion' | 'active' | 'retained';
}

interface UserSegment {
  segment: string;
  businesses: number;
  influencers: number;
  conversionRate: number;
  avgTimeToConvert: number; // in days
}

interface LifecycleFunnelProps {
  className?: string;
}

export function LifecycleFunnel({ className }: LifecycleFunnelProps) {
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [segmentData, setSegmentData] = useState<UserSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Generate mock funnel data
  const generateMockData = () => {
    // Realistic conversion funnel with dropoff rates
    const totalSignups = 1000;
    const stages: Omit<FunnelStage, 'fill'>[] = [
      {
        name: 'Signups',
        value: totalSignups,
        stage: 'signup'
      },
      {
        name: 'Completed Onboarding',
        value: Math.floor(totalSignups * 0.75), // 75% complete onboarding
        stage: 'onboarded'
      },
      {
        name: 'Created First Coupon',
        value: Math.floor(totalSignups * 0.75 * 0.65), // 65% of onboarded create coupon
        stage: 'first_coupon'
      },
      {
        name: 'First Conversion',
        value: Math.floor(totalSignups * 0.75 * 0.65 * 0.45), // 45% get first conversion
        stage: 'first_conversion'
      },
      {
        name: 'Active Users',
        value: Math.floor(totalSignups * 0.75 * 0.65 * 0.45 * 0.80), // 80% become active
        stage: 'active'
      },
      {
        name: 'Retained (30 days)',
        value: Math.floor(totalSignups * 0.75 * 0.65 * 0.45 * 0.80 * 0.60), // 60% retained
        stage: 'retained'
      }
    ];

    // Add conversion and dropoff rates
    const funnelStages: FunnelStage[] = stages.map((stage, index) => {
      const prevValue = index > 0 ? stages[index - 1].value : stage.value;
      const conversionRate = index > 0 ? (stage.value / prevValue) * 100 : 100;
      const dropoffRate = 100 - conversionRate;

      return {
        ...stage,
        conversionRate,
        dropoffRate,
        fill: [CHART_COLORS.primary, CHART_COLORS.info, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.secondary, CHART_COLORS.purple][index]
      };
    });

    // User segments data
    const segments: UserSegment[] = [
      {
        segment: 'Food & Beverage',
        businesses: Math.floor(totalSignups * 0.4 * 0.75),
        influencers: Math.floor(totalSignups * 0.6 * 0.75),
        conversionRate: 0.45,
        avgTimeToConvert: 7.2
      },
      {
        segment: 'Retail & Fashion',
        businesses: Math.floor(totalSignups * 0.25 * 0.75),
        influencers: Math.floor(totalSignups * 0.25 * 0.75),
        conversionRate: 0.38,
        avgTimeToConvert: 12.8
      },
      {
        segment: 'Health & Wellness',
        businesses: Math.floor(totalSignups * 0.2 * 0.75),
        influencers: Math.floor(totalSignups * 0.1 * 0.75),
        conversionRate: 0.52,
        avgTimeToConvert: 5.4
      },
      {
        segment: 'Entertainment',
        businesses: Math.floor(totalSignups * 0.15 * 0.75),
        influencers: Math.floor(totalSignups * 0.05 * 0.75),
        conversionRate: 0.35,
        avgTimeToConvert: 15.1
      }
    ];

    return { funnelStages, segments };
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/control-center/lifecycle-funnel
    setTimeout(() => {
      const { funnelStages, segments } = generateMockData();
      setFunnelData(funnelStages);
      setSegmentData(segments);
      setLoading(false);
    }, 600);
  }, []);

  // Format functions
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const formatDays = (days: number) => {
    return `${days.toFixed(1)} days`;
  };

  // Custom funnel tooltip
  const FunnelTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as FunnelStage;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p>Users: {formatNumber(data.value)}</p>
            {data.conversionRate && (
              <p className="text-green-600">Conversion: {formatPercentage(data.conversionRate)}</p>
            )}
            {data.dropoffRate && data.dropoffRate > 0 && (
              <p className="text-red-600">Drop-off: {formatPercentage(data.dropoffRate)}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Export functionality
  const handleExport = () => {
    const exportData = funnelData.map(stage => ({
      Stage: stage.name,
      Users: stage.value,
      'Conversion Rate': stage.conversionRate ? `${stage.conversionRate.toFixed(1)}%` : '100%',
      'Drop-off Rate': stage.dropoffRate ? `${stage.dropoffRate.toFixed(1)}%` : '0%',
    }));
    exportToCSV(exportData, 'user-lifecycle-funnel');
  };

  // Calculate key metrics
  const totalSignups = funnelData[0]?.value || 0;
  const totalRetained = funnelData[funnelData.length - 1]?.value || 0;
  const overallConversion = totalSignups > 0 ? (totalRetained / totalSignups) * 100 : 0;
  const biggestDropoff = funnelData.reduce((max, stage) => 
    (stage.dropoffRate || 0) > max.rate ? { stage: stage.name, rate: stage.dropoffRate || 0 } : max, 
    { stage: '', rate: 0 }
  );

  return (
    <ChartContainer
      title="User Lifecycle Funnel"
      subtitle="Track user progression from signup to retention"
      onExport={handleExport}
      metrics={[
        { label: 'Total Signups', value: formatNumber(totalSignups), color: CHART_COLORS.primary },
        { label: 'Overall Conversion', value: formatPercentage(overallConversion), color: CHART_COLORS.success },
        { label: 'Retained Users', value: formatNumber(totalRetained), color: CHART_COLORS.info },
      ]}
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading funnel data...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Funnel Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-brand">User Journey Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <FunnelChart>
                  <Tooltip content={<FunnelTooltip />} />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="center" fill="#fff" stroke="none" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stage Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-brand">Stage Conversion Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.map((stage, index) => (
                    <div 
                      key={stage.name} 
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedStage === stage.name ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedStage(selectedStage === stage.name ? null : stage.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: stage.fill }}
                          />
                          <span className="font-medium">{stage.name}</span>
                        </div>
                        <Badge className={`${stage.conversionRate && stage.conversionRate < 50 ? 'bg-red-100 text-red-800' : stage.conversionRate && stage.conversionRate < 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {stage.conversionRate ? formatPercentage(stage.conversionRate) : '100%'}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatNumber(stage.value)} users</span>
                        {stage.dropoffRate && stage.dropoffRate > 0 && (
                          <span className="text-red-600">
                            -{formatPercentage(stage.dropoffRate)} drop-off
                          </span>
                        )}
                      </div>
                      
                      {stage.conversionRate && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${stage.conversionRate < 50 ? 'bg-red-500' : stage.conversionRate < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${stage.conversionRate}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Segments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-brand">Segment Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {segmentData.map((segment, index) => (
                    <div key={segment.segment} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{segment.segment}</h4>
                        <Badge className={`${segment.conversionRate > 0.45 ? 'bg-green-100 text-green-800' : segment.conversionRate > 0.35 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {formatPercentage(segment.conversionRate * 100)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Businesses</div>
                          <div className="font-medium">{formatNumber(segment.businesses)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Influencers</div>
                          <div className="font-medium">{formatNumber(segment.influencers)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Avg. Time to Convert</div>
                          <div className="font-medium">{formatDays(segment.avgTimeToConvert)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Total Users</div>
                          <div className="font-medium">{formatNumber(segment.businesses + segment.influencers)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Best Converting Stage</span>
                </div>
                <div className="text-2xl font-bold text-green-900 mb-1">
                  {funnelData.reduce((best, stage) => 
                    (stage.conversionRate || 0) > (best.conversionRate || 0) ? stage : best
                  ).name}
                </div>
                <div className="text-sm text-green-700">
                  {formatPercentage(funnelData.reduce((best, stage) => 
                    (stage.conversionRate || 0) > (best.conversionRate || 0) ? stage : best
                  ).conversionRate || 0)} conversion rate
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Biggest Drop-off</span>
                </div>
                <div className="text-2xl font-bold text-red-900 mb-1">
                  {biggestDropoff.stage}
                </div>
                <div className="text-sm text-red-700">
                  {formatPercentage(biggestDropoff.rate)} users lost
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Avg. Time to Activate</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {formatDays(segmentData.reduce((sum, s) => sum + s.avgTimeToConvert, 0) / segmentData.length)}
                </div>
                <div className="text-sm text-blue-700">
                  Across all segments
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-purple-900 mb-2">High Priority:</h4>
                  <ul className="space-y-1 text-purple-800">
                    <li>• Improve {biggestDropoff.stage.toLowerCase()} flow to reduce {formatPercentage(biggestDropoff.rate)} drop-off</li>
                    <li>• Focus onboarding improvements on Health & Wellness segment (fastest converters)</li>
                    <li>• Create targeted campaigns for Entertainment segment (slowest converters)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-purple-900 mb-2">Medium Priority:</h4>
                  <ul className="space-y-1 text-purple-800">
                    <li>• Implement progressive onboarding for complex features</li>
                    <li>• Add success milestones and celebration moments</li>
                    <li>• Create segment-specific landing pages and flows</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Click on funnel stages for detailed breakdown | Data refreshed hourly
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Users className="w-3 h-3 mr-1" />
                User Cohorts
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                <Target className="w-3 h-3 mr-1" />
                Optimization Tools
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 