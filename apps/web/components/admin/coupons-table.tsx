'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Plus, Calendar, DollarSign } from 'lucide-react';

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

interface CouponsTableProps {
  onCouponSelect?: (coupon: Coupon) => void;
}

export function CouponsTable({ onCouponSelect }: CouponsTableProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    bizId: '',
    infId: '',
    q: '',
  });
  
  // Usage form state
  const [usageForm, setUsageForm] = useState<{
    couponId: string | null;
    date: string;
    uses: string;
    revenue: string;
  }>({
    couponId: null,
    date: new Date().toISOString().split('T')[0], // Today
    uses: '',
    revenue: '',
  });
  
  const [usageLoading, setUsageLoading] = useState(false);

  // Fetch coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.type) queryParams.set('type', filters.type);
      if (filters.bizId) queryParams.set('bizId', filters.bizId);
      if (filters.infId) queryParams.set('infId', filters.infId);
      if (filters.q) queryParams.set('q', filters.q);
      
      const response = await fetch(`/api/control-center/coupons/list?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch coupons');
      }
      
      const data = await response.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  // Handle POS flag toggle
  const handlePosToggle = async (couponId: string, posAdded: boolean) => {
    try {
      const response = await fetch('/api/control-center/coupon/pos-flag', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ couponId, posAdded }),
      });

      if (!response.ok) {
        throw new Error('Failed to update POS status');
      }

      // Update local state
      setCoupons(prev => prev.map(coupon => 
        coupon.id === couponId 
          ? { 
              ...coupon, 
              admin: { 
                ...coupon.admin, 
                posAdded,
                posAddedAt: posAdded ? new Date().toISOString() : coupon.admin.posAddedAt 
              }
            }
          : coupon
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update POS status');
    }
  };

  // Handle usage record submission
  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usageForm.couponId || !usageForm.uses) return;
    
    try {
      setUsageLoading(true);
      
      const response = await fetch('/api/control-center/coupon/usage-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          couponId: usageForm.couponId,
          date: usageForm.date,
          uses: parseInt(usageForm.uses),
          revenue_cents: usageForm.revenue ? parseInt(usageForm.revenue) * 100 : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record usage');
      }

      // Reset form and close
      setUsageForm({
        couponId: null,
        date: new Date().toISOString().split('T')[0],
        uses: '',
        revenue: '',
      });
      
      // Optionally refresh data
      fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record usage');
    } finally {
      setUsageLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (cents?: number) => {
    if (!cents) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'issued': return 'bg-blue-100 text-blue-800';
      case 'redeemed': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Type badge colors
  const getTypeColor = (type: string) => {
    return type === 'AFFILIATE' 
      ? 'bg-orange-100 text-orange-800' 
      : 'bg-pink-100 text-pink-800';
  };

  useEffect(() => {
    fetchCoupons();
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-brand">Coupons</h1>
          <p className="text-gray-600">Manage affiliate and content meal coupons</p>
        </div>
        <Button className="bg-brand hover:bg-brand/90">
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search business, influencer, or code..."
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label>Status</Label>
              <Select 
                value={filters.status || "all"} 
                onValueChange={(value: string) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="redeemed">Redeemed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <Label>Type</Label>
              <Select 
                value={filters.type || "all"} 
                onValueChange={(value: string) => setFilters(prev => ({ ...prev, type: value === "all" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="AFFILIATE">Affiliate</SelectItem>
                  <SelectItem value="CONTENT_MEAL">Content Meal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setFilters({ status: '', type: '', bizId: '', infId: '', q: '' })}
                className="w-full"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Coupon ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>POS Added</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cap</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading coupons...
                    </TableCell>
                  </TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow 
                      key={coupon.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onCouponSelect?.(coupon)}
                    >
                      <TableCell>{formatDate(coupon.createdAt)}</TableCell>
                      <TableCell className="font-mono text-sm">{coupon.code}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(coupon.type)}>
                          {coupon.type === 'AFFILIATE' ? 'Affiliate' : 'Content Meal'}
                        </Badge>
                      </TableCell>
                      <TableCell>{coupon.business?.name || 'Unknown'}</TableCell>
                      <TableCell>{coupon.influencer?.handle || 'Unknown'}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={coupon.admin.posAdded}
                          onCheckedChange={(checked: boolean) => 
                            handlePosToggle(coupon.id, checked)
                          }
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        {coupon.deadlineAt ? formatDate(coupon.deadlineAt) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(coupon.status)}>
                          {coupon.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(coupon.cap_cents)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUsageForm(prev => ({ ...prev, couponId: coupon.id }));
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Usage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Record Usage</DialogTitle>
                              <DialogDescription>
                                Add manual usage data for coupon {coupon.code}
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUsageSubmit} className="space-y-4">
                              <div>
                                <Label>Date</Label>
                                <Input
                                  type="date"
                                  value={usageForm.date}
                                  onChange={(e) => setUsageForm(prev => ({ 
                                    ...prev, 
                                    date: e.target.value 
                                  }))}
                                  required
                                />
                              </div>
                              <div>
                                <Label>Number of Uses</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={usageForm.uses}
                                  onChange={(e) => setUsageForm(prev => ({ 
                                    ...prev, 
                                    uses: e.target.value 
                                  }))}
                                  placeholder="5"
                                  required
                                />
                              </div>
                              <div>
                                <Label>Revenue (USD, optional)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={usageForm.revenue}
                                  onChange={(e) => setUsageForm(prev => ({ 
                                    ...prev, 
                                    revenue: e.target.value 
                                  }))}
                                  placeholder="125.00"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <DialogTrigger asChild>
                                  <Button type="button" variant="outline">
                                    Cancel
                                  </Button>
                                </DialogTrigger>
                                <Button 
                                  type="submit" 
                                  className="bg-brand hover:bg-brand/90"
                                  disabled={usageLoading}
                                >
                                  {usageLoading ? 'Recording...' : 'Record Usage'}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 