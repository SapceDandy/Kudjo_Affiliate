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
  Users, 
  UserPlus,
  Building2,
  Filter,
  RefreshCw,
  Eye,
  Mail,
  Calendar
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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    q: '',
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real app, this would be an API call
      // const response = await fetch('/api/admin/users');
      // const data = await response.json();
      // setUsers(data);
      
      // For now, use mock data
      setTimeout(() => {
        const mockUsers = generateMockUsers();
        setUsers(mockUsers);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to fetch users');
      setLoading(false);
    }
  };

  // Generate mock users
  const generateMockUsers = (): User[] => {
    const mockUsers: User[] = [];
    
    // Generate influencers
    for (let i = 0; i < 100; i++) {
      mockUsers.push({
        id: `inf_${i}`,
        email: `influencer${i}@example.com`,
        displayName: `Influencer ${i}`,
        role: 'influencer',
        createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        lastLoginAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
        photoURL: Math.random() > 0.3 ? `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${i % 100}.jpg` : undefined,
        status: Math.random() > 0.1 ? 'active' : Math.random() > 0.5 ? 'pending' : 'suspended',
        handle: `@influencer${i}`,
        followers: Math.floor(1000 + Math.random() * 100000),
      });
    }
    
    // Generate businesses
    for (let i = 0; i < 100; i++) {
      mockUsers.push({
        id: `biz_${i}`,
        email: `business${i}@example.com`,
        displayName: `Business ${i} Owner`,
        role: 'business',
        createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        lastLoginAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
        photoURL: Math.random() > 0.3 ? `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${i % 100}.jpg` : undefined,
        status: Math.random() > 0.1 ? 'active' : Math.random() > 0.5 ? 'pending' : 'suspended',
        businessName: `Business ${i} ${['Inc.', 'LLC', 'Co.', 'Ltd.'][Math.floor(Math.random() * 4)]}`,
        industry: ['Retail', 'Food & Beverage', 'Technology', 'Fashion', 'Health & Wellness'][Math.floor(Math.random() * 5)],
      });
    }
    
    return mockUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    // Filter by role
    if (filters.role !== 'all' && user.role !== filters.role) {
      return false;
    }
    
    // Filter by status
    if (filters.status !== 'all' && user.status !== filters.status) {
      return false;
    }
    
    // Filter by search query
    if (filters.q) {
      const query = filters.q.toLowerCase();
      return (
        user.email.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query) ||
        (user.handle && user.handle.toLowerCase().includes(query)) ||
        (user.businessName && user.businessName.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM dd, yyyy');
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

  // View user details
  const viewUser = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-brand hover:bg-brand/90">
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
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
                  placeholder="Search by name, email, or handle..."
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <Select 
                value={filters.role} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="influencer">Influencers</SelectItem>
                  <SelectItem value="business">Businesses</SelectItem>
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

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-brand" />
            {filters.role === 'influencer' ? 'Influencers' : 
             filters.role === 'business' ? 'Businesses' : 'All Users'} 
            <Badge className="ml-2 bg-gray-100 text-gray-800">
              {filteredUsers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => viewUser(user.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                {user.displayName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <div>{user.displayName}</div>
                            <div className="text-xs text-gray-500">
                              {user.role === 'influencer' ? user.handle : user.businessName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={user.role === 'influencer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                          {user.role === 'influencer' ? 'Influencer' : 'Business'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewUser(user.id);
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