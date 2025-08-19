'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onExport?: () => void;
  trend?: {
    value: number;
    label: string;
  };
  metrics?: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  actions?: ReactNode;
  className?: string;
}

export function ChartContainer({ 
  title, 
  subtitle, 
  children, 
  onExport,
  trend,
  metrics,
  actions,
  className = ""
}: ChartContainerProps) {
  
  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-3 h-3" />;
    if (value < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatTrendValue = (value: number) => {
    const abs = Math.abs(value);
    return `${value >= 0 ? '+' : ''}${abs.toFixed(1)}%`;
  };

  return (
    <Card className={`shadow-lg border-brand/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-brand">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Trend and Metrics */}
        {(trend || metrics) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            {trend && (
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(trend.value)}`}>
                {getTrendIcon(trend.value)}
                <span className="font-medium">{formatTrendValue(trend.value)}</span>
                <span className="text-gray-500">{trend.label}</span>
              </div>
            )}
            
            {metrics && (
              <div className="flex items-center gap-3">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {metric.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: metric.color }}
                      />
                    )}
                    <span className="text-sm text-gray-600">{metric.label}:</span>
                    <span className="text-sm font-medium">{metric.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

// Predefined chart color palette
export const CHART_COLORS = {
  primary: '#DC4533',
  secondary: '#F97316',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gray: '#6B7280',
};

// Export function for CSV data
export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Date range picker component for chart filters
interface DateRangePickerProps {
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ label: string; value: string }>;
}

export function DateRangePicker({ value, onChange, options }: DateRangePickerProps) {
  const defaultOptions = [
    { label: '7 days', value: '7' },
    { label: '30 days', value: '30' },
    { label: '90 days', value: '90' },
    { label: 'Custom', value: 'custom' },
  ];

  const availableOptions = options || defaultOptions;

  return (
    <div className="flex gap-1">
      {availableOptions.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
          className={value === option.value ? "bg-brand hover:bg-brand/90" : ""}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
} 