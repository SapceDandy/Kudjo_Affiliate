'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Building2, 
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  Tag,
  Users,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface Business {
  id: string;
  name: string;
  email: string;
  ownerName: string;
  industry: string;
  createdAt: string;
  lastLoginAt?: string;
  logo?: string;
  status: 'active' | 'pending' | 'suspended';
  influencerCount: number;
  couponCount: number;
  revenue: number;
}

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    industry: 'all',
    status: 'all',
    q: '',
  });

  // Fetch businesses
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real app, this would be an API call
      // const response = await fetch('/api/admin/businesses');
      // const data = await response.json();
      // setBusinesses(data);
      
      // For now, use mock data
      setTimeout(() => {
        const mockBusinesses = generateMockBusinesses();
        setBusinesses(mockBusinesses);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to fetch businesses');
      setLoading(false);
    }
  };

  // Generate mock businesses
  const generateMockBusinesses = (): Business[] => {
    const industries = ['Retail', 'Food & Beverage', 'Technology', 'Fashion', 'Health & Wellness'];
    const mockBusinesses: Business[] = [];
    
    for (let i = 0; i < 100; i++) {
      const industry = industries[Math.floor(Math.random() * industries.length)];
      mockBusinesses.push({
        id: `biz_${i}`,
        name: `Business ${i} ${['Inc.', 'LLC', 'Co.', 'Ltd.'][Math.floor(Math.random() * 4)]}`,
        email: `business${i}@example.com`,
        ownerName: `Owner ${i}`,
        industry,
        createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        lastLoginAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
        logo: Math.random() > 0.3 ? `https://ui-avatars.com/api/?name=B${i}&background=random` : undefined,
        status: Math.random() > 0.1 ? 'active' : Math.random() > 0.5 ? 'pending' : 'suspended',
        influencerCount: Math.floor(Math.random() * 20),
        couponCount: Math.floor(Math.random() * 50),
        revenue: Math.floor(Math.random() * 100000) * 100, // in cents
      });
    }
    
    return mockBusinesses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Filter businesses
  const filteredBusinesses = businesses.filter(business => {
    // Filter by industry
    if (filters.industry !== 'all' && business.industry !== filters.industry) {
      return false;
    }
    
    // Filter by status
    if (filters.status !== 'all' && business.status !== filters.status) {
      return false;
    }
    
    // Filter by search query
    if (filters.q) {
      const query = filters.q.toLowerCase();
      return (
        business.name.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query) ||
        business.ownerName.toLowerCase().includes(query) ||
        business.industry.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Load businesses on mount
  useEffect(() => {
    fetchBusinesses();
  }, []);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // View business details
  const viewBusiness = (businessId: string) => {
    router.push(`/admin/businesses/${businessId}`);
  };

  // Get unique industries for filter
  const uniqueIndustries = Array.from(new Set(businesses.map(b => b.industry)));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Business Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBusinesses} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-brand hover:bg-brand/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Business
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or owner..."
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Industry Filter */}
            <div>
              <Select 
                value={filters.industry} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {uniqueIndustries.map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Businesses Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand" />
            Businesses
            <Badge className="ml-2 bg-gray-100 text-gray-800">
              {filteredBusinesses.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Influencers</TableHead>
                  <TableHead>Coupons</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading businesses...
                    </TableCell>
                  </TableRow>
                ) : filteredBusinesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No businesses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBusinesses.map((business) => (
                    <TableRow 
                      key={business.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => viewBusiness(business.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {business.logo ? (
                            <img 
                              src={business.logo} 
                              alt={business.name} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                {business.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div>{business.name}</div>
                            <div className="text-xs text-gray-500">{business.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{business.ownerName}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800">
                          {business.industry}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(business.status)}>
                          {business.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(business.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-purple-600" />
                          {business.influencerCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-blue-600" />
                          {business.couponCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-600" />
                          {formatCurrency(business.revenue)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewBusiness(business.id);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
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