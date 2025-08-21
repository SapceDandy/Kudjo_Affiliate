'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Building2,
  Tag,
  Edit,
  Trash,
  DollarSign,
  BarChart3,
  Save,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'influencer' | 'business';
  createdAt: string;
  lastLoginAt?: string;
  photoURL?: string;
  status: 'active' | 'pending' | 'suspended';
  // For influencers
  handle?: string;
  followers?: number;
  // For businesses
  businessName?: string;
  industry?: string;
}

interface Coupon {
  id: string;
  code: string;
  businessId: string;
  businessName: string;
  influencerId?: string;
  influencerHandle?: string;
  status: 'active' | 'expired' | 'redeemed';
  createdAt: string;
  expiresAt?: string;
  redemptions: number;
  revenue: number;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [redemptionCount, setRedemptionCount] = useState('');
  const [redemptionRevenue, setRedemptionRevenue] = useState('');

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real app, these would be API calls
        // For now, use mock data
        setTimeout(() => {
          // Check if it's an influencer or business ID
          const isInfluencer = params.id.startsWith('inf_');
          const idNumber = parseInt(params.id.split('_')[1]);
          
          if (isInfluencer) {
            // Mock influencer data
            setUser({
              id: params.id,
              email: `influencer${idNumber}@example.com`,
              displayName: `Influencer ${idNumber}`,
              role: 'influencer',
              createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
              lastLoginAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
              status: 'active',
              handle: `@influencer${idNumber}`,
              followers: Math.floor(1000 + Math.random() * 100000),
            });
            
            // Generate mock coupons for this influencer
            const mockCoupons = Array.from({ length: 5 }, (_, i) => {
              const isActive = Math.random() > 0.3;
              const isExpired = !isActive && Math.random() > 0.5;
              return {
                id: `coupon_${i}`,
                code: `INF${idNumber}BIZ${i}`,
                businessId: `biz_${i + 10}`,
                businessName: `Business ${i + 10}`,
                status: (isActive ? 'active' : isExpired ? 'expired' : 'redeemed') as 'active' | 'expired' | 'redeemed',
                createdAt: new Date(Date.now() - Math.random() * 5000000000).toISOString(),
                expiresAt: isExpired ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
                redemptions: Math.floor(Math.random() * 50),
                revenue: Math.floor(Math.random() * 5000) * 100,
              };
            });
            setCoupons(mockCoupons);
          } else {
            // Mock business data
            setUser({
              id: params.id,
              email: `business${idNumber}@example.com`,
              displayName: `Business ${idNumber} Owner`,
              role: 'business',
              createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
              lastLoginAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
              status: 'active',
              businessName: `Business ${idNumber}`,
              industry: ['Retail', 'Food & Beverage', 'Technology', 'Fashion', 'Health & Wellness'][Math.floor(Math.random() * 5)],
            });
            
            // Generate mock coupons for this business
            const mockCoupons = Array.from({ length: 5 }, (_, i) => {
              const isActive = Math.random() > 0.3;
              const isExpired = !isActive && Math.random() > 0.5;
              return {
                id: `coupon_${i}`,
                code: `BIZ${idNumber}INF${i}`,
                businessId: params.id,
                businessName: `Business ${idNumber}`,
                influencerId: `inf_${i + 20}`,
                influencerHandle: `@influencer${i + 20}`,
                status: (isActive ? 'active' : isExpired ? 'expired' : 'redeemed') as 'active' | 'expired' | 'redeemed',
                createdAt: new Date(Date.now() - Math.random() * 5000000000).toISOString(),
                expiresAt: isExpired ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
                redemptions: Math.floor(Math.random() * 50),
                revenue: Math.floor(Math.random() * 5000) * 100,
              };
            });
            setCoupons(mockCoupons);
          }
          
          setLoading(false);
        }, 500);
      } catch (err) {
        setError('Failed to fetch user data');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [params.id]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'redeemed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle coupon edit
  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setRedemptionCount(coupon.redemptions.toString());
    setRedemptionRevenue((coupon.revenue / 100).toString());
  };

  // Save coupon updates
  const saveCouponUpdates = () => {
    if (!editingCoupon) return;
    
    // Update local state
    setCoupons(coupons.map(c => {
      if (c.id === editingCoupon.id) {
        return {
          ...c,
          redemptions: parseInt(redemptionCount),
          revenue: parseFloat(redemptionRevenue) * 100,
        };
      }
      return c;
    }));
    
    // Close dialog
    setEditingCoupon(null);
  };

  // Calculate total stats
  const totalRedemptions = coupons.reduce((sum, coupon) => sum + coupon.redemptions, 0);
  const totalRevenue = coupons.reduce((sum, coupon) => sum + coupon.revenue, 0);
  const activeCoupons = coupons.filter(coupon => coupon.status === 'active').length;

  // Go back to users list
  const goBack = () => {
    router.push('/control-center/users');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">Loading user data...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || 'User not found'}
        </div>
        <Button variant="outline" className="mt-4" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {user.role === 'influencer' ? 'Influencer' : 'Business'} Details
        </h1>
      </div>

      {/* User Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* User Avatar */}
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl text-gray-600">
                  {user.displayName.charAt(0)}
                </span>
              )}
            </div>
            
            {/* User Details */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold">{user.displayName}</h2>
                <Badge className={getStatusColor(user.status)}>
                  {user.status}
                </Badge>
                <Badge className={user.role === 'influencer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                  {user.role === 'influencer' ? 'Influencer' : 'Business'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{user.email}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Joined {formatDate(user.createdAt)}</span>
                </div>
                
                {user.role === 'influencer' && user.handle && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{user.handle}</span>
                  </div>
                )}
                
                {user.role === 'influencer' && user.followers && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{user.followers.toLocaleString()} followers</span>
                  </div>
                )}
                
                {user.role === 'business' && user.businessName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span>{user.businessName}</span>
                  </div>
                )}
                
                {user.role === 'business' && user.industry && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span>{user.industry}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Active Coupons</div>
                <div className="text-2xl font-bold">{activeCoupons}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Total Redemptions</div>
                <div className="text-2xl font-bold">{totalRedemptions}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand" />
            Coupons
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>
                    {user.role === 'influencer' ? 'Business' : 'Influencer'}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-medium">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        {user.role === 'influencer' 
                          ? coupon.businessName 
                          : coupon.influencerHandle}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(coupon.status)}>
                          {coupon.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(coupon.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No expiry'}
                      </TableCell>
                      <TableCell>{coupon.redemptions}</TableCell>
                      <TableCell>{formatCurrency(coupon.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditCoupon(coupon)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Coupon Redemptions</DialogTitle>
                              <DialogDescription>
                                Update the redemption count and revenue for coupon {coupon.code}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Redemption Count</Label>
                                <Input 
                                  type="number" 
                                  value={redemptionCount}
                                  onChange={(e) => setRedemptionCount(e.target.value)}
                                  min="0"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Revenue (USD)</Label>
                                <Input 
                                  type="number" 
                                  value={redemptionRevenue}
                                  onChange={(e) => setRedemptionRevenue(e.target.value)}
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                variant="outline" 
                                onClick={() => setEditingCoupon(null)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={saveCouponUpdates}
                                className="bg-brand hover:bg-brand/90"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </Button>
                            </DialogFooter>
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