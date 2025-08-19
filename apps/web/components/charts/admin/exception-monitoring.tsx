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
  BarChart,
  Bar
} from 'recharts';
import { ChartContainer, CHART_COLORS, exportToCSV, DateRangePicker } from '../chart-container';
import { 
  AlertTriangle, 
  Shield, 
  Bug, 
  Server,
  Activity,
  Eye,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertOctagon
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface ExceptionData {
  date: string;
  error_count: number;
  warning_count: number;
  critical_count: number;
  fraud_attempts: number;
  response_time_ms: number;
  uptime_percentage: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'critical' | 'fraud';
  message: string;
  timestamp: string;
  source: string;
  resolved: boolean;
  affectedUsers?: number;
}

interface ExceptionMonitoringProps {
  className?: string;
}

export function ExceptionMonitoring({ className }: ExceptionMonitoringProps) {
  const [data, setData] = useState<ExceptionData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  // Generate mock exception data
  const generateMockData = (days: number): { data: ExceptionData[], alerts: Alert[] } => {
    const exceptionData: ExceptionData[] = [];
    const alertsData: Alert[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      
      // Simulate varying error rates with some incidents
      const baseErrorRate = 5 + Math.random() * 10; // 5-15 errors per day normally
      const hasIncident = Math.random() < 0.1; // 10% chance of incident
      const incidentMultiplier = hasIncident ? 3 + Math.random() * 5 : 1;
      
      const error_count = Math.floor(baseErrorRate * incidentMultiplier);
      const warning_count = Math.floor(error_count * (2 + Math.random() * 3)); // 2-5x more warnings
      const critical_count = hasIncident ? Math.floor(Math.random() * 3) : 0;
      const fraud_attempts = Math.floor(Math.random() * 5); // 0-5 fraud attempts per day
      const response_time_ms = hasIncident ? 200 + Math.random() * 300 : 80 + Math.random() * 120;
      const uptime_percentage = hasIncident ? 95 + Math.random() * 4 : 99 + Math.random() * 0.9;
      
      exceptionData.push({
        date,
        error_count,
        warning_count,
        critical_count,
        fraud_attempts,
        response_time_ms,
        uptime_percentage,
      });

      // Generate alerts for critical issues
      if (critical_count > 0) {
        alertsData.push({
          id: `alert_${i}_critical`,
          type: 'critical',
          message: 'Database connection timeout detected',
          timestamp: new Date(subDays(new Date(), i).getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          source: 'Database',
          resolved: Math.random() > 0.3,
          affectedUsers: Math.floor(Math.random() * 100),
        });
      }

      if (error_count > 20) {
        alertsData.push({
          id: `alert_${i}_error`,
          type: 'error',
          message: 'High error rate detected in payment processing',
          timestamp: new Date(subDays(new Date(), i).getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          source: 'Payment API',
          resolved: Math.random() > 0.2,
          affectedUsers: Math.floor(Math.random() * 50),
        });
      }

      if (fraud_attempts > 3) {
        alertsData.push({
          id: `alert_${i}_fraud`,
          type: 'fraud',
          message: 'Suspicious coupon redemption pattern detected',
          timestamp: new Date(subDays(new Date(), i).getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          source: 'Fraud Detection',
          resolved: Math.random() > 0.4,
        });
      }
    }

    // Add some recent real-time alerts
    const recentAlerts: Alert[] = [
      {
        id: 'alert_recent_1',
        type: 'warning',
        message: 'API response time above threshold (>200ms)',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
        source: 'API Gateway',
        resolved: false,
        affectedUsers: 0,
      },
      {
        id: 'alert_recent_2',
        type: 'error',
        message: 'Failed coupon generation - external API timeout',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        source: 'Coupon Service',
        resolved: true,
        affectedUsers: 15,
      }
    ];

    return { 
      data: exceptionData, 
      alerts: [...alertsData, ...recentAlerts].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    };
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/control-center/exception-monitoring?days=${dateRange}
    setTimeout(() => {
      const { data: mockData, alerts: mockAlerts } = generateMockData(parseInt(dateRange));
      setData(mockData);
      setAlerts(mockAlerts);
      setLoading(false);
    }, 700);
  }, [dateRange]);

  // Format functions
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDuration = (ms: number) => {
    return `${ms.toFixed(0)}ms`;
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) return `${diffHours}h ago`;
    return `${diffMins}m ago`;
  };

  // Get alert type styling
  const getAlertTypeColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fraud': return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getAlertTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical': return <AlertOctagon className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'fraud': return <Shield className="w-4 h-4" />;
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ExceptionData;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{format(parseISO(label), 'MMM dd, yyyy')}</p>
          <div className="space-y-1 text-sm">
            <p style={{ color: CHART_COLORS.danger }}>
              Errors: {data.error_count}
            </p>
            <p style={{ color: CHART_COLORS.warning }}>
              Warnings: {data.warning_count}
            </p>
            <p style={{ color: CHART_COLORS.primary }}>
              Critical: {data.critical_count}
            </p>
            <p style={{ color: CHART_COLORS.purple }}>
              Fraud Attempts: {data.fraud_attempts}
            </p>
            <p className="text-gray-600">
              Response Time: {formatDuration(data.response_time_ms)}
            </p>
            <p className="text-gray-600">
              Uptime: {formatPercentage(data.uptime_percentage)}
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
      'Error Count': item.error_count,
      'Warning Count': item.warning_count,
      'Critical Count': item.critical_count,
      'Fraud Attempts': item.fraud_attempts,
      'Response Time (ms)': item.response_time_ms.toFixed(0),
      'Uptime %': item.uptime_percentage.toFixed(2),
    }));
    exportToCSV(exportData, `exception-monitoring-${dateRange}days`);
  };

  // Calculate summary metrics
  const totalErrors = data.reduce((sum, day) => sum + day.error_count, 0);
  const totalCritical = data.reduce((sum, day) => sum + day.critical_count, 0);
  const totalFraud = data.reduce((sum, day) => sum + day.fraud_attempts, 0);
  const avgResponseTime = data.length > 0 ? data.reduce((sum, day) => sum + day.response_time_ms, 0) / data.length : 0;
  const avgUptime = data.length > 0 ? data.reduce((sum, day) => sum + day.uptime_percentage, 0) / data.length : 0;
  const activeAlerts = alerts.filter(alert => !alert.resolved);

  return (
    <ChartContainer
      title="Exception Monitoring & System Health"
      subtitle="Real-time monitoring of errors, incidents, and security threats"
      onExport={handleExport}
      metrics={[
        { label: 'Active Alerts', value: activeAlerts.length.toString(), color: CHART_COLORS.danger },
        { label: 'Avg Response Time', value: formatDuration(avgResponseTime), color: CHART_COLORS.info },
        { label: 'System Uptime', value: formatPercentage(avgUptime), color: CHART_COLORS.success },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker 
            value={dateRange} 
            onChange={setDateRange}
            options={[
              { label: '24 hours', value: '1' },
              { label: '7 days', value: '7' },
              { label: '30 days', value: '30' }
            ]}
          />
          <Button variant="outline" size="sm">
            <Activity className="w-3 h-3 mr-1" />
            Live Logs
          </Button>
        </div>
      }
      className={className}
    >
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading monitoring data...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* System Health Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Bug className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Total Errors</span>
                </div>
                <div className="text-2xl font-bold text-red-900">{formatNumber(totalErrors)}</div>
                <div className="text-xs text-red-600">Last {dateRange} days</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertOctagon className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Critical Issues</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{formatNumber(totalCritical)}</div>
                <div className="text-xs text-orange-600">Requiring immediate attention</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Fraud Attempts</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{formatNumber(totalFraud)}</div>
                <div className="text-xs text-purple-600">Blocked by security systems</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Server className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">System Status</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {avgUptime > 99 ? 'Healthy' : avgUptime > 97 ? 'Degraded' : 'Critical'}
                </div>
                <div className="text-xs text-green-600">{formatPercentage(avgUptime)} uptime</div>
              </CardContent>
            </Card>
          </div>

          {/* Error Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-brand">Error Trends Over Time</CardTitle>
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
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Area
                    type="monotone"
                    dataKey="warning_count"
                    stackId="1"
                    stroke={CHART_COLORS.warning}
                    fill={CHART_COLORS.warning}
                    fillOpacity={0.6}
                    name="Warnings"
                  />
                  <Area
                    type="monotone"
                    dataKey="error_count"
                    stackId="1"
                    stroke={CHART_COLORS.danger}
                    fill={CHART_COLORS.danger}
                    fillOpacity={0.8}
                    name="Errors"
                  />
                  <Area
                    type="monotone"
                    dataKey="critical_count"
                    stackId="1"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={1}
                    name="Critical"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Active Alerts ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No active alerts - All systems operational</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border ${getAlertTypeColor(alert.type)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getAlertTypeIcon(alert.type)}
                          <div>
                            <div className="font-medium">{alert.message}</div>
                            <div className="text-sm opacity-75 mt-1">
                              {alert.source} • {formatTimeAgo(alert.timestamp)}
                              {alert.affectedUsers && ` • ${alert.affectedUsers} users affected`}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" className="bg-brand hover:bg-brand/90">
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {activeAlerts.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm">
                        View All {activeAlerts.length} Alerts
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance & Security Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-brand">Response Time Trends</CardTitle>
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
                    <Tooltip 
                      formatter={(value: number) => [formatDuration(value), 'Response Time']}
                      labelFormatter={(label) => format(parseISO(label), 'MMM dd, yyyy')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="response_time_ms" 
                      stroke={CHART_COLORS.info} 
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.info, strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Security Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-brand">Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar
                      dataKey="fraud_attempts"
                      fill={CHART_COLORS.purple}
                      name="Fraud Attempts"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* System Status Footer */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">All Systems Operational</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last updated: {format(new Date(), 'MMM dd, h:mm a')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Activity className="w-3 h-3 mr-1" />
                    System Status Page
                  </Button>
                  <Button size="sm" className="bg-brand hover:bg-brand/90">
                    <Zap className="w-3 h-3 mr-1" />
                    Configure Alerts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ChartContainer>
  );
} 