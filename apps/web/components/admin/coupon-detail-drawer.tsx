'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  X, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface Coupon {
  id: string;
  type: 'AFFILIATE' | 'CONTENT_MEAL';
  bizId: string;
  infId: string;
  offerId: string;
  code: string;
  status: 'issued' | 'active' | 'redeemed' | 'expired';
  cap_cents?: number;
  deadlineAt?: string;
  createdAt: string;
  admin: {
    posAdded: boolean;
    posAddedAt?: string;
    notes?: string;
  };
  business?: {
    name: string;
  };
  influencer?: {
    handle: string;
  };
}

interface UsageData {
  date: string;
  uses: number;
  revenue_cents: number;
}

interface Redemption {
  id: string;
  amount_cents: number;
  discount_cents: number;
  createdAt: string;
  status: 'pending' | 'payable' | 'paid';
}

interface CouponDetailDrawerProps {
  coupon: Coupon | null;
  onClose: () => void;
}

export function CouponDetailDrawer({ coupon, onClose }: CouponDetailDrawerProps) {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [posUpdating, setPosUpdating] = useState(false);

  // Generate mock usage data for the last 30 days
  const generateMockUsageData = (): UsageData[] => {
    const data: UsageData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const uses = Math.floor(Math.random() * 10);
      const revenue_cents = uses * (2000 + Math.floor(Math.random() * 3000)); // $20-50 per use
      data.push({ date, uses, revenue_cents });
    }
    return data;
  };

  // Generate mock redemptions
  const generateMockRedemptions = (): Redemption[] => {
    const redemptions: Redemption[] = [];
    for (let i = 0; i < 5; i++) {
      redemptions.push({
        id: `red_${i}`,
        amount_cents: 2500 + Math.floor(Math.random() * 5000),
        discount_cents: 500 + Math.floor(Math.random() * 1000),
        createdAt: subDays(new Date(), Math.floor(Math.random() * 7)).toISOString(),
        status: ['pending', 'payable', 'paid'][Math.floor(Math.random() * 3)] as any,
      });
    }
    return redemptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Load usage data when coupon changes
  useEffect(() => {
    if (!coupon) return;
    
    setLoading(true);
    // In a real app, fetch from API: /api/control-center/coupon/${coupon.id}/stats
    setTimeout(() => {
      setUsageData(generateMockUsageData());
      setRedemptions(generateMockRedemptions());
      setLoading(false);
    }, 500);
  }, [coupon]);

  // Handle POS toggle
  const handlePosToggle = async (posAdded: boolean) => {
    if (!coupon) return;
    
    setPosUpdating(true);
    try {
      const response = await fetch('/api/control-center/coupon/pos-flag', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ couponId: coupon.id, posAdded }),
      });

      if (!response.ok) {
        throw new Error('Failed to update POS status');
      }

      // Update local coupon state would happen in parent component
    } catch (err) {
      console.error('Failed to update POS status:', err);
    } finally {
      setPosUpdating(false);
    }
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  };

  // Calculate totals
  const totalUses = usageData.reduce((sum, day) => sum + day.uses, 0);
  const totalRevenue = usageData.reduce((sum, day) => sum + day.revenue_cents, 0);
  const averageOrderValue = totalUses > 0 ? totalRevenue / totalUses : 0;

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'issued': return 'bg-blue-100 text-blue-800';
      case 'redeemed': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRedemptionStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'payable': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!coupon) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl border-l z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-brand">Coupon Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <code className="px-2 py-1 bg-gray-200 rounded text-lg font-mono">
            {coupon.code}
          </code>
          <Badge className={coupon.type === 'AFFILIATE' ? 'bg-orange-100 text-orange-800' : 'bg-pink-100 text-pink-800'}>
            {coupon.type === 'AFFILIATE' ? 'Affiliate' : 'Content Meal'}
          </Badge>
          <Badge className={getStatusColor(coupon.status)}>
            {coupon.status}
          </Badge>
        </div>

        {/* POS Status */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={coupon.admin.posAdded}
            onCheckedChange={handlePosToggle}
            disabled={posUpdating}
          />
          <span className="text-sm text-gray-600">
            {coupon.admin.posAdded ? 'Added to POS' : 'Not added to POS'}
          </span>
          {coupon.admin.posAddedAt && (
            <span className="text-xs text-gray-400">
              ({format(parseISO(coupon.admin.posAddedAt), 'MMM dd')})
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Total Uses</span>
                </div>
                <div className="text-2xl font-bold">{totalUses}</div>
                <div className="text-xs text-gray-500">Last 30 days</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Revenue</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <div className="text-xs text-gray-500">Last 30 days</div>
              </CardContent>
            </Card>
          </div>

          {/* Coupon Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Business:</span>
                <span className="font-medium">{coupon.business?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Influencer:</span>
                <span className="font-medium">@{coupon.influencer?.handle || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span>{formatDate(coupon.createdAt)}</span>
              </div>
              {coupon.deadlineAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Deadline:</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(coupon.deadlineAt)}
                  </span>
                </div>
              )}
              {coupon.cap_cents && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Spending Cap:</span>
                  <span>{formatCurrency(coupon.cap_cents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Order Value:</span>
                <span>{formatCurrency(averageOrderValue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage Trend (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center text-gray-500">
                  Loading chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      labelFormatter={(date) => format(parseISO(date as string), 'MMM dd, yyyy')}
                      formatter={(value, name) => [
                        name === 'uses' ? value : formatCurrency(value as number),
                        name === 'uses' ? 'Uses' : 'Revenue'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="uses" 
                      stroke="#DC4533" 
                      strokeWidth={2}
                      dot={{ fill: '#DC4533', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Redemptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Redemptions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-gray-500">Loading redemptions...</div>
              ) : redemptions.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No redemptions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {redemptions.map((redemption) => (
                    <div key={redemption.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{formatCurrency(redemption.amount_cents)}</div>
                        <div className="text-sm text-gray-600">
                          Discount: {formatCurrency(redemption.discount_cents)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(redemption.createdAt), 'MMM dd, h:mm a')}
                        </div>
                      </div>
                      <Badge className={getRedemptionStatusColor(redemption.status)}>
                        {redemption.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Report
            </Button>
            <Button className="bg-brand hover:bg-brand/90">
              Export Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 