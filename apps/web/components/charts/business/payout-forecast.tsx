'use client';

import { useState, useEffect } from 'react';
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
  Legend,
  ReferenceLine
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV } from '../chart-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  CreditCard,
  Target
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns';

interface PayoutForecastData {
  date: string;
  pending_cents: number;
  due_cents: number;
  forecasted_cents: number;
  cumulative_cents: number;
  confidence_level: number; // 0-1 where 1 is high confidence
}

interface PayoutEvent {
  date: string;
  amount_cents: number;
  type: 'scheduled' | 'estimated' | 'milestone';
  description: string;
  influencer_count: number;
}

interface PayoutForecastProps {
  bizId: string;
  className?: string;
}

type ForecastPeriod = '30' | '60' | '90';

export function PayoutForecast({ bizId, className }: PayoutForecastProps) {
  const [data, setData] = useState<PayoutForecastData[]>([]);
  const [events, setEvents] = useState<PayoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ForecastPeriod>('60');

  // Generate mock forecast data
  const generateMockData = (days: number): { data: PayoutForecastData[], events: PayoutEvent[] } => {
    const forecastData: PayoutForecastData[] = [];
    const payoutEvents: PayoutEvent[] = [];
    let cumulativeAmount = 0;

    for (let i = 0; i <= days; i++) {
      const date = format(addDays(new Date(), i), 'yyyy-MM-dd');
      
      // Simulate weekly payout cycles with some variation
      const dayOfWeek = addDays(new Date(), i).getDay();
      const isPayoutDay = dayOfWeek === 5; // Fridays
      const isMonthEnd = addDays(new Date(), i).getDate() >= 28;
      
      // Base amounts with seasonality
      const seasonalMultiplier = 1 + Math.sin((i / days) * Math.PI * 2) * 0.3;
      const basePending = Math.floor((2000 + Math.random() * 3000) * seasonalMultiplier); // $20-50/day
      const baseDue = isPayoutDay ? Math.floor((8000 + Math.random() * 12000) * seasonalMultiplier) : 0; // $80-200 on payout days
      const baseForecasted = Math.floor((1500 + Math.random() * 2500) * seasonalMultiplier); // $15-40/day
      
      // Confidence decreases with time
      const confidence_level = Math.max(0.3, 1 - (i / days) * 0.7);
      
      // Cumulative calculation
      cumulativeAmount += basePending + baseDue + baseForecasted;
      
      forecastData.push({
        date,
        pending_cents: basePending,
        due_cents: baseDue,
        forecasted_cents: baseForecasted,
        cumulative_cents: cumulativeAmount,
        confidence_level,
      });

      // Add payout events
      if (isPayoutDay && baseDue > 0) {
        payoutEvents.push({
          date,
          amount_cents: baseDue + Math.floor(basePending * 0.7), // Include some pending
          type: i <= 14 ? 'scheduled' : 'estimated',
          description: `Weekly payout - ${Math.floor(5 + Math.random() * 10)} influencers`,
          influencer_count: Math.floor(5 + Math.random() * 10),
        });
      }

      // Add monthly milestone
      if (isMonthEnd && i > 7) {
        payoutEvents.push({
          date,
          amount_cents: Math.floor((15000 + Math.random() * 10000) * seasonalMultiplier),
          type: 'milestone',
          description: 'Monthly tier bonuses',
          influencer_count: Math.floor(15 + Math.random() * 10),
        });
      }
    }

    return { data: forecastData, events: payoutEvents };
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/business/payout-forecast?bizId=${bizId}&days=${period}
    setTimeout(() => {
      const result = generateMockData(parseInt(period));
      setData(result.data);
      setEvents(result.events);
      setLoading(false);
    }, 700);
  }, [bizId, period]);

  // Calculate summary metrics
  const totalUpcoming = data.reduce((sum, day) => sum + day.pending_cents + day.due_cents + day.forecasted_cents, 0);
  const nextWeekDue = data.slice(0, 7).reduce((sum, day) => sum + day.due_cents, 0);
  const avgWeeklyPayout = data.length > 7 ? (data.slice(0, Math.floor(data.length / 7) * 7).reduce((sum, day) => sum + day.due_cents, 0) / Math.floor(data.length / 7)) : 0;
  const highConfidenceAmount = data.filter(d => d.confidence_level >= 0.8).reduce((sum, day) => sum + day.pending_cents + day.due_cents, 0);

  // Format functions
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'MMM dd');
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PayoutForecastData;
      const event = events.find(e => e.date === label);
      
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{format(parseISO(label), 'MMM dd, yyyy')}</p>
          <div className="space-y-1 text-sm">
            <p style={{ color: CHART_COLORS.warning }}>
              Pending: {formatCurrency(data.pending_cents)}
            </p>
            <p style={{ color: CHART_COLORS.danger }}>
              Due: {formatCurrency(data.due_cents)}
            </p>
            <p style={{ color: CHART_COLORS.info }}>
              Forecasted: {formatCurrency(data.forecasted_cents)}
            </p>
            <p className="text-gray-600 pt-1">
              Confidence: {formatConfidence(data.confidence_level)}
            </p>
            {event && (
              <div className="pt-2 border-t">
                <p className="font-medium text-purple-600">{event.description}</p>
                <p className="text-xs text-gray-500">{formatCurrency(event.amount_cents)} • {event.influencer_count} influencers</p>
              </div>
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
      'Pending': item.pending_cents / 100,
      'Due': item.due_cents / 100,
      'Forecasted': item.forecasted_cents / 100,
      'Cumulative': item.cumulative_cents / 100,
      'Confidence': formatConfidence(item.confidence_level),
    }));
    exportToCSV(exportData, `payout-forecast-${bizId}-${period}days`);
  };

  // Get next major payout
  const nextMajorPayout = events
    .filter(e => e.amount_cents > 10000) // > $100
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <ChartContainer
      title="Payout Forecast"
      subtitle="Projected payment obligations and cash flow planning"
      onExport={handleExport}
      metrics={[
        { label: 'Next 7 Days Due', value: formatCurrency(nextWeekDue), color: CHART_COLORS.danger },
        { label: 'Total Upcoming', value: formatCurrency(totalUpcoming), color: CHART_COLORS.primary },
        { label: 'High Confidence', value: formatCurrency(highConfidenceAmount), color: CHART_COLORS.success },
      ]}
      actions={
        <div className="flex gap-1">
          <Button
            variant={period === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30')}
            className={period === '30' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            30 Days
          </Button>
          <Button
            variant={period === '60' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('60')}
            className={period === '60' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            60 Days
          </Button>
          <Button
            variant={period === '90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('90')}
            className={period === '90' ? 'bg-brand hover:bg-brand/90' : ''}
          >
            90 Days
          </Button>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading forecast data...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Alert for upcoming large payouts */}
          {nextMajorPayout && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">
                  Large payout scheduled: {formatCurrency(nextMajorPayout.amount_cents)} on {formatDate(nextMajorPayout.date)}
                </p>
                <p className="text-sm text-orange-700">{nextMajorPayout.description}</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Next Week</span>
                </div>
                <div className="text-lg font-bold text-orange-900">{formatCurrency(nextWeekDue)}</div>
                <div className="text-xs text-orange-600">due for payout</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Avg Weekly</span>
                </div>
                <div className="text-lg font-bold text-blue-900">{formatCurrency(avgWeeklyPayout)}</div>
                <div className="text-xs text-blue-600">payout amount</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Confidence</span>
                </div>
                <div className="text-lg font-bold text-green-900">
                  {formatConfidence(data.slice(0, 7).reduce((sum, d) => sum + d.confidence_level, 0) / 7)}
                </div>
                <div className="text-xs text-green-600">next 7 days</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Events</span>
                </div>
                <div className="text-lg font-bold text-purple-900">{events.length}</div>
                <div className="text-xs text-purple-600">scheduled payouts</div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickFormatter={formatDate}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatCurrency(value).replace('$', '$')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Due amounts (high priority) */}
              <Area
                type="monotone"
                dataKey="due_cents"
                stackId="1"
                stroke={CHART_COLORS.danger}
                fill={CHART_COLORS.danger}
                fillOpacity={0.8}
                name="Due Now"
              />

              {/* Pending amounts (medium priority) */}
              <Area
                type="monotone"
                dataKey="pending_cents"
                stackId="1"
                stroke={CHART_COLORS.warning}
                fill={CHART_COLORS.warning}
                fillOpacity={0.6}
                name="Pending"
              />

              {/* Forecasted amounts (lower priority) */}
              <Area
                type="monotone"
                dataKey="forecasted_cents"
                stackId="1"
                stroke={CHART_COLORS.info}
                fill={CHART_COLORS.info}
                fillOpacity={0.4}
                name="Forecasted"
              />

              {/* Confidence level reference line */}
              <ReferenceLine 
                y={data.reduce((sum, d) => sum + (d.pending_cents + d.due_cents + d.forecasted_cents), 0) / data.length} 
                stroke={CHART_COLORS.gray} 
                strokeDasharray="5 5"
                label={{ value: "Daily Avg", position: "top" }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Upcoming Events */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Upcoming Payout Events</h4>
            <div className="space-y-2">
              {events.slice(0, 5).map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.type === 'scheduled' ? 'bg-green-500' :
                      event.type === 'estimated' ? 'bg-yellow-500' : 'bg-purple-500'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">{event.description}</div>
                      <div className="text-xs text-gray-600">
                        {formatDate(event.date)} • {event.influencer_count} influencers
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(event.amount_cents)}</div>
                    <Badge className={`text-xs ${
                      event.type === 'scheduled' ? 'bg-green-100 text-green-800' :
                      event.type === 'estimated' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cash Flow Insights */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Cash Flow Insights</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Peak payout days typically fall on Fridays</p>
                <p>• {events.filter(e => e.type === 'scheduled').length} confirmed payouts in next 2 weeks</p>
                <p>• Monthly bonuses add approximately 15% to weekly payouts</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Maintain {formatCurrency(nextWeekDue * 1.1)} cash buffer for next week</p>
                <p>• Consider automated payout scheduling for efficiency</p>
                <p>• Review high-uncertainty forecasts beyond 30 days</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Hover chart to see daily breakdown and events
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="w-3 h-3 mr-1" />
                Schedule Payouts
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                <DollarSign className="w-3 h-3 mr-1" />
                Cash Flow Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 