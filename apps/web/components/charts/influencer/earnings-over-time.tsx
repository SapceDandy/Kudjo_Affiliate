'use client';

import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV, DateRangePicker } from '../chart-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, parseISO } from 'date-fns';

interface EarningsData {
  date: string;
  pending_cents: number;
  payable_cents: number;
  paid_cents: number;
  total_cents: number;
}

interface EarningsOverTimeProps {
  infId: string;
  className?: string;
}

export function EarningsOverTime({ infId, className }: EarningsOverTimeProps) {
  const [data, setData] = useState<EarningsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');

  // Generate mock earnings data
  const generateMockData = (days: number): EarningsData[] => {
    const earningsData: EarningsData[] = [];
    let cumulativePaid = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      
      // Simulate daily earnings with some randomness
      const dailyEarnings = Math.floor(Math.random() * 15000) + 5000; // $50-200/day
      const pendingPct = 0.3 + Math.random() * 0.2; // 30-50% pending
      const payablePct = 0.4 + Math.random() * 0.2; // 40-60% payable
      
      const pending_cents = Math.floor(dailyEarnings * pendingPct);
      const payable_cents = Math.floor(dailyEarnings * payablePct);
      const paid_cents = dailyEarnings - pending_cents - payable_cents;
      
      cumulativePaid += paid_cents;
      
      earningsData.push({
        date,
        pending_cents,
        payable_cents,
        paid_cents: cumulativePaid, // Cumulative for area chart
        total_cents: pending_cents + payable_cents + paid_cents,
      });
    }
    
    return earningsData;
  };

  // Load data based on filters
  useEffect(() => {
    setLoading(true);
    
    // In a real app, fetch from: /api/influencer/earnings?infId=${infId}&days=${dateRange}&status=${statusFilter}&bizId=${businessFilter}
    setTimeout(() => {
      setData(generateMockData(parseInt(dateRange)));
      setLoading(false);
    }, 800);
  }, [infId, dateRange, statusFilter, businessFilter]);

  // Calculate summary metrics
  const totalEarnings = data.reduce((sum, day) => sum + day.total_cents, 0);
  const totalPending = data.reduce((sum, day) => sum + day.pending_cents, 0);
  const totalPayable = data.reduce((sum, day) => sum + day.payable_cents, 0);
  const totalPaid = data.length > 0 ? data[data.length - 1].paid_cents : 0;

  // Calculate trend (last 7 days vs previous 7 days)
  const recentData = data.slice(-7);
  const previousData = data.slice(-14, -7);
  const recentTotal = recentData.reduce((sum, day) => sum + day.total_cents, 0);
  const previousTotal = previousData.reduce((sum, day) => sum + day.total_cents, 0);
  const trend = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal) * 100 : 0;

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium">{format(parseISO(label), 'MMM dd, yyyy')}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Export functionality
  const handleExport = () => {
    const exportData = data.map(item => ({
      Date: item.date,
      Pending: item.pending_cents / 100,
      Payable: item.payable_cents / 100,
      Paid: item.paid_cents / 100,
      Total: item.total_cents / 100,
    }));
    exportToCSV(exportData, `earnings-${infId}-${dateRange}days`);
  };

  // Drill down to daily details
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      // Navigate to detailed earnings view for that day
      console.log('Navigate to earnings detail for:', data.activeLabel);
    }
  };

  return (
    <ChartContainer
      title="Earnings Over Time"
      subtitle="Track your payout progress across all businesses"
      onExport={handleExport}
      trend={{
        value: trend,
        label: 'vs previous period'
      }}
      metrics={[
        { label: 'Pending', value: formatCurrency(totalPending), color: CHART_COLORS.warning },
        { label: 'Payable', value: formatCurrency(totalPayable), color: CHART_COLORS.info },
        { label: 'Paid', value: formatCurrency(totalPaid), color: CHART_COLORS.success },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="payable">Payable</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading earnings data...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-700">Pending Payouts</div>
              <div className="text-lg font-semibold text-yellow-900">{formatCurrency(totalPending)}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">Ready to Pay</div>
              <div className="text-lg font-semibold text-blue-900">{formatCurrency(totalPayable)}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">Total Paid</div>
              <div className="text-lg font-semibold text-green-900">{formatCurrency(totalPaid)}</div>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value).replace('$', '$')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {statusFilter === 'all' || statusFilter === 'paid' ? (
                <Area
                  type="monotone"
                  dataKey="paid_cents"
                  stackId="1"
                  stroke={CHART_COLORS.success}
                  fill={CHART_COLORS.success}
                  fillOpacity={0.6}
                  name="Paid"
                />
              ) : null}
              
              {statusFilter === 'all' || statusFilter === 'payable' ? (
                <Area
                  type="monotone"
                  dataKey="payable_cents"
                  stackId="1"
                  stroke={CHART_COLORS.info}
                  fill={CHART_COLORS.info}
                  fillOpacity={0.6}
                  name="Payable"
                />
              ) : null}
              
              {statusFilter === 'all' || statusFilter === 'pending' ? (
                <Area
                  type="monotone"
                  dataKey="pending_cents"
                  stackId="1"
                  stroke={CHART_COLORS.warning}
                  fill={CHART_COLORS.warning}
                  fillOpacity={0.6}
                  name="Pending"
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Click chart areas to view daily breakdown
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                View Payout Schedule
              </Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90">
                Request Payout
              </Button>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
} 