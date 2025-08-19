'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle, 
  Calendar,
  Upload,
  ExternalLink
} from 'lucide-react';
import { format, parseISO, isPast, addDays, differenceInDays } from 'date-fns';

interface ContentCoupon {
  id: string;
  code: string;
  businessName: string;
  deadlineAt: string;
  status: 'issued' | 'active' | 'completed' | 'overdue';
  proofUrl?: string;
  amount_cents: number;
  requirements?: string;
}

interface PendingPayout {
  id: string;
  amount_cents: number;
  businesses: string[];
  periodStart: string;
  periodEnd: string;
  status: 'pending' | 'processing' | 'scheduled';
  payoutDate?: string;
}

interface ComplianceKPIsProps {
  infId: string;
  className?: string;
}

export function ComplianceKPIs({ infId, className }: ComplianceKPIsProps) {
  const [contentCoupons, setContentCoupons] = useState<ContentCoupon[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate mock data
  const generateMockData = () => {
    const businesses = ['Golden Spoon', 'Urban Eats', 'Cafe Nouveau', 'Burger Palace', 'Sushi Zen'];
    
    // Generate content coupons with various statuses
    const mockContentCoupons: ContentCoupon[] = [];
    for (let i = 0; i < 8; i++) {
      const deadlineDate = addDays(new Date(), Math.floor(Math.random() * 14) - 7); // -7 to +7 days
      const isOverdue = isPast(deadlineDate);
      const hasProof = Math.random() > 0.4;
      
      mockContentCoupons.push({
        id: `content_${i}`,
        code: `MEAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        businessName: businesses[Math.floor(Math.random() * businesses.length)],
        deadlineAt: deadlineDate.toISOString(),
        status: isOverdue && !hasProof ? 'overdue' : hasProof ? 'completed' : 'active',
        proofUrl: hasProof ? `https://example.com/proof/${i}` : undefined,
        amount_cents: Math.floor(Math.random() * 4000) + 2000, // $20-60
        requirements: 'Post story and feed content with coupon code',
      });
    }

    // Generate pending payouts
    const mockPayouts: PendingPayout[] = [
      {
        id: 'payout_1',
        amount_cents: 47500, // $475
        businesses: ['Golden Spoon', 'Urban Eats', 'Cafe Nouveau'],
        periodStart: addDays(new Date(), -30).toISOString(),
        periodEnd: addDays(new Date(), -1).toISOString(),
        status: 'pending',
      },
      {
        id: 'payout_2',
        amount_cents: 23200, // $232
        businesses: ['Burger Palace', 'Sushi Zen'],
        periodStart: addDays(new Date(), -60).toISOString(),
        periodEnd: addDays(new Date(), -31).toISOString(),
        status: 'processing',
        payoutDate: addDays(new Date(), 3).toISOString(),
      }
    ];

    return { mockContentCoupons, mockPayouts };
  };

  useEffect(() => {
    setLoading(true);
    
    // In a real app: /api/influencer/compliance?infId=${infId}
    setTimeout(() => {
      const { mockContentCoupons, mockPayouts } = generateMockData();
      setContentCoupons(mockContentCoupons);
      setPendingPayouts(mockPayouts);
      setLoading(false);
    }, 600);
  }, [infId]);

  // Calculate metrics
  const overdueCoupons = contentCoupons.filter(c => c.status === 'overdue');
  const dueSoonCoupons = contentCoupons.filter(c => {
    const deadline = parseISO(c.deadlineAt);
    const daysUntil = differenceInDays(deadline, new Date());
    return daysUntil >= 0 && daysUntil <= 2 && c.status === 'active';
  });
  const completedCoupons = contentCoupons.filter(c => c.status === 'completed');
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount_cents, 0);

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format date
  const formatDate = (dateStr: string, includeTime = false) => {
    const date = parseISO(dateStr);
    return format(date, includeTime ? 'MMM dd, h:mm a' : 'MMM dd, yyyy');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get urgency for content coupons
  const getUrgency = (coupon: ContentCoupon) => {
    if (coupon.status === 'overdue') return 'overdue';
    if (coupon.status === 'completed') return 'completed';
    
    const deadline = parseISO(coupon.deadlineAt);
    const daysUntil = differenceInDays(deadline, new Date());
    
    if (daysUntil <= 1) return 'urgent';
    if (daysUntil <= 3) return 'soon';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'text-red-600';
      case 'urgent': return 'text-orange-600';
      case 'soon': return 'text-yellow-600';
      case 'completed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Overdue Content</span>
            </div>
            <div className="text-2xl font-bold text-red-900">{overdueCoupons.length}</div>
            <div className="text-xs text-red-700">Requires immediate attention</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Due Soon</span>
            </div>
            <div className="text-2xl font-bold text-yellow-900">{dueSoonCoupons.length}</div>
            <div className="text-xs text-yellow-700">Next 2 days</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{completedCoupons.length}</div>
            <div className="text-xs text-green-700">This period</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Pending Payouts</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalPendingAmount)}</div>
            <div className="text-xs text-blue-700">{pendingPayouts.length} payouts</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Coupons Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-brand">Content Coupons</CardTitle>
            <Button size="sm" className="bg-brand hover:bg-brand/90">
              <Calendar className="w-3 h-3 mr-1" />
              View Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading content coupons...</div>
          ) : contentCoupons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No content coupons found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentCoupons
                  .sort((a, b) => {
                    // Sort by urgency first, then by deadline
                    const urgencyOrder = { overdue: 0, urgent: 1, soon: 2, normal: 3, completed: 4 };
                    const aUrgency = getUrgency(a);
                    const bUrgency = getUrgency(b);
                    
                    if (urgencyOrder[aUrgency as keyof typeof urgencyOrder] !== urgencyOrder[bUrgency as keyof typeof urgencyOrder]) {
                      return urgencyOrder[aUrgency as keyof typeof urgencyOrder] - urgencyOrder[bUrgency as keyof typeof urgencyOrder];
                    }
                    
                    return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
                  })
                  .map((coupon) => {
                    const urgency = getUrgency(coupon);
                    const deadline = parseISO(coupon.deadlineAt);
                    const daysUntil = differenceInDays(deadline, new Date());
                    
                    return (
                      <TableRow key={coupon.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <code className="text-sm font-mono">{coupon.code}</code>
                            {coupon.requirements && (
                              <div className="text-xs text-gray-500 mt-1">{coupon.requirements}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{coupon.businessName}</TableCell>
                        <TableCell>
                          <div className={`font-medium ${getUrgencyColor(urgency)}`}>
                            {formatDate(coupon.deadlineAt)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {coupon.status === 'overdue' 
                              ? `${Math.abs(daysUntil)} days overdue`
                              : daysUntil === 0 
                                ? 'Due today' 
                                : daysUntil === 1 
                                  ? 'Due tomorrow' 
                                  : `${daysUntil} days left`
                            }
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(coupon.amount_cents)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(coupon.status)}>
                            {coupon.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {coupon.proofUrl ? (
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View Proof
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm">
                                <Upload className="w-3 h-3 mr-1" />
                                Upload Proof
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Payouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-brand">Pending Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-gray-500">Loading payouts...</div>
          ) : pendingPayouts.length === 0 ? (
            <div className="text-center py-6 text-gray-500">No pending payouts</div>
          ) : (
            <div className="space-y-4">
              {pendingPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-lg">{formatCurrency(payout.amount_cents)}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                    </div>
                    <div className="text-sm text-gray-500">
                      From: {payout.businesses.join(', ')}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getStatusColor(payout.status)}>
                      {payout.status}
                    </Badge>
                    {payout.payoutDate && (
                      <div className="text-sm text-gray-600 mt-1">
                        Expected: {formatDate(payout.payoutDate)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end">
                <Button variant="outline" size="sm">
                  View All Payouts
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 