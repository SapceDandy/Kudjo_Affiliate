'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Building2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PendingUser {
  id: string;
  type: 'business' | 'influencer';
  name?: string;
  businessName?: string;
  email: string;
  createdAt: string;
  approvalStatus: string;
  tier?: string;
  followers?: number;
  category?: string;
  description?: string;
  website?: string;
  phone?: string;
}

interface ApprovalQueueData {
  businesses: PendingUser[];
  influencers: PendingUser[];
  totalPending: number;
}

export function ApprovalQueue() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApprovalQueueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/admin/pending-approvals', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${res.status}`);
      }
      
      const result = await res.json();
      setData(result.data);
    } catch (e: any) {
      console.error('Error fetching pending approvals:', e);
      setError(e?.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: PendingUser) => {
    setActionLoading(user.id);
    
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userType: user.type,
          adminId: 'admin-user',
          reason: 'Approved via admin dashboard'
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          if (result.error?.code === 'DUPLICATE_REQUEST') {
            toast.error('This approval request is already being processed by another admin');
          } else if (result.error?.code === 'ALREADY_APPROVED') {
            toast.error('This user is already approved');
            // Remove from pending list since they're already approved
            if (user.type === 'business') {
              setData(prev => prev ? ({...prev, businesses: prev.businesses.filter(b => b.id !== user.id)}) : null);
            } else {
              setData(prev => prev ? ({...prev, influencers: prev.influencers.filter(i => i.id !== user.id)}) : null);
            }
          } else {
            toast.error(result.error?.message || 'Approval conflict occurred');
          }
        } else {
          toast.error(result.error?.message || 'Failed to approve user');
        }
        return;
      }

      toast.success(`${user.type} approved successfully`);
      
      // Remove from pending list
      if (user.type === 'business') {
        setData(prev => prev ? ({...prev, businesses: prev.businesses.filter(b => b.id !== user.id)}) : null);
      } else {
        setData(prev => prev ? ({...prev, influencers: prev.influencers.filter(i => i.id !== user.id)}) : null);
      }
      
    } catch (e: any) {
      console.error('Error approving user:', e);
      toast.error('Network error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(selectedUser.id);
    
    try {
      const response = await fetch('/api/admin/reject-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          userType: selectedUser.type,
          adminId: 'admin-user',
          reason: rejectionReason
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          if (result.error?.code === 'DUPLICATE_REQUEST') {
            toast.error('This approval request is already being processed by another admin');
          } else if (result.error?.code === 'ALREADY_REJECTED') {
            toast.error(result.error?.message || 'This user was recently rejected');
            // Remove from pending list since they're already processed
            if (selectedUser.type === 'business') {
              setData(prev => prev ? ({...prev, businesses: prev.businesses.filter(b => b.id !== selectedUser.id)}) : null);
            } else {
              setData(prev => prev ? ({...prev, influencers: prev.influencers.filter(i => i.id !== selectedUser.id)}) : null);
            }
          } else {
            toast.error(result.error?.message || 'Rejection conflict occurred');
          }
        } else {
          toast.error(result.error?.message || 'Failed to reject user');
        }
        return;
      }

      toast.success(`${selectedUser.type} rejected successfully`);
      
      // Remove from pending list
      if (selectedUser.type === 'business') {
        setData(prev => prev ? ({...prev, businesses: prev.businesses.filter(b => b.id !== selectedUser.id)}) : null);
      } else {
        setData(prev => prev ? ({...prev, influencers: prev.influencers.filter(i => i.id !== selectedUser.id)}) : null);
      }
      
      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectionReason('');
      
    } catch (e: any) {
      console.error('Error rejecting user:', e);
      toast.error('Network error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (user: PendingUser) => {
    setSelectedUser(user);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const UserCard = ({ user }: { user: PendingUser }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gray-100">
                {user.type === 'business' ? 
                  (user.businessName || user.name || 'B').charAt(0).toUpperCase() :
                  (user.name || 'I').charAt(0).toUpperCase()
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-sm">
                {user.type === 'business' ? user.businessName || user.name : user.name}
              </h4>
              <p className="text-xs text-gray-500">{user.email}</p>
              {user.type === 'influencer' && user.followers && (
                <p className="text-xs text-blue-600">{formatNumber(user.followers)} followers</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {user.type === 'business' ? <Building2 className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
            {user.type}
          </Badge>
        </div>

        {user.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{user.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(user.createdAt)}
          </span>
          {user.tier && (
            <Badge variant="secondary" className="text-xs">
              {user.tier} tier
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleApprove(user)}
            disabled={actionLoading === `approve-${user.id}`}
          >
            {actionLoading === `approve-${user.id}` ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3 mr-1" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => openRejectDialog(user)}
            disabled={actionLoading === `reject-${user.id}`}
          >
            {actionLoading === `reject-${user.id}` ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <XCircle className="w-3 h-3 mr-1" />
            )}
            Reject
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Eye className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {user.type === 'business' ? 'Business' : 'Influencer'} Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-600">
                    {user.type === 'business' ? user.businessName || user.name : user.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                {user.phone && (
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-gray-600">{user.phone}</p>
                  </div>
                )}
                {user.website && (
                  <div>
                    <Label className="text-sm font-medium">Website</Label>
                    <p className="text-sm text-gray-600">{user.website}</p>
                  </div>
                )}
                {user.category && (
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm text-gray-600">{user.category}</p>
                  </div>
                )}
                {user.followers && (
                  <div>
                    <Label className="text-sm font-medium">Followers</Label>
                    <p className="text-sm text-gray-600">{formatNumber(user.followers)}</p>
                  </div>
                )}
                {user.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-gray-600">{user.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Applied</Label>
                  <p className="text-sm text-gray-600">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">Loading pending approvals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPendingApprovals} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand" />
            Pending Approvals
          </h2>
          <p className="text-sm text-gray-600">
            {data?.totalPending || 0} users awaiting approval
          </p>
        </div>
        <Button onClick={fetchPendingApprovals} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-blue-600 bg-blue-100 p-2 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Businesses</p>
                <p className="text-xl font-bold text-gray-900">{data?.businesses.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-purple-600 bg-purple-100 p-2 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Influencers</p>
                <p className="text-xl font-bold text-gray-900">{data?.influencers.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Businesses Section */}
      {data?.businesses && data.businesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Pending Businesses ({data.businesses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.businesses.map((business) => (
                <UserCard key={business.id} user={business} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Influencers Section */}
      {data?.influencers && data.influencers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pending Influencers ({data.influencers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.influencers.map((influencer) => (
                <UserCard key={influencer.id} user={influencer} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {data?.totalPending === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">No pending approvals at this time.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selectedUser?.type === 'business' ? 'Business' : 'Influencer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={actionLoading === `reject-${selectedUser?.id}`}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || actionLoading === `reject-${selectedUser?.id}`}
              >
                {actionLoading === `reject-${selectedUser?.id}` ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
