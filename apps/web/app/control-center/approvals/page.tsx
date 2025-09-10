'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, User, Building2, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PendingApproval {
  id: string;
  type: 'business' | 'influencer';
  name: string;
  email: string;
  createdAt: string;
  approvalStatus: string;
  businessName?: string;
  followers?: number;
  tier?: string;
  socialMedia?: {
    instagram?: string;
    tiktok?: string;
  };
  canReapplyAt?: string;
  approvalHistory?: Array<{
    action: string;
    adminId: string;
    timestamp: string;
    reason?: string;
  }>;
}

interface SocialVerificationRequest {
  id: string;
  userId: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter';
  handle: string;
  status: 'pending' | 'approved' | 'rejected' | 'need_more_info';
  requestedAt: string;
  requestedBy: string;
  followerCount?: number;
  profileUrl?: string;
  avatarUrl?: string;
  adminMessage?: string;
  processedAt?: string;
  processedBy?: string;
}

export default function ApprovalsPage() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [socialVerificationRequests, setSocialVerificationRequests] = useState<SocialVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [selectedSocialRequest, setSelectedSocialRequest] = useState<SocialVerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [socialActionMessage, setSocialActionMessage] = useState('');
  const [followerCount, setFollowerCount] = useState<number | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch('/api/admin/pending-approvals', {
        headers: {
          'x-admin-bypass': 'true'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data.approvals || []);
      } else {
        toast.error('Failed to load pending approvals');
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast.error('Error loading approvals');
    }
  };

  const fetchSocialVerificationRequests = async () => {
    try {
      const response = await fetch('/api/admin/social-verification', {
        headers: {
          'x-admin-bypass': 'true'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSocialVerificationRequests(data.requests || []);
      } else {
        toast.error('Failed to load social verification requests');
      }
    } catch (error) {
      console.error('Error fetching social verification requests:', error);
      toast.error('Error loading social verification requests');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPendingApprovals(),
      fetchSocialVerificationRequests()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleApprove = async (approval: PendingApproval) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true'
        },
        body: JSON.stringify({
          userId: approval.id,
          userType: approval.type,
          adminId: 'admin-user', // TODO: Get from session
          reason: 'Approved by admin'
        }),
      });

      if (response.ok) {
        toast.success(`${approval.type === 'business' ? 'Business' : 'Influencer'} approved successfully`);
        fetchAllData(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Error approving user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/reject-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true'
        },
        body: JSON.stringify({
          userId: selectedApproval.id,
          userType: selectedApproval.type,
          adminId: 'admin-user', // TODO: Get from session
          reason: rejectionReason
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${selectedApproval.type === 'business' ? 'Business' : 'Influencer'} rejected`);
        setSelectedApproval(null);
        setRejectionReason('');
        fetchAllData(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Error rejecting user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSocialVerificationAction = async (action: 'approve' | 'reject' | 'need_more_info') => {
    if (!selectedSocialRequest) {
      toast.error('No request selected');
      return;
    }

    if ((action === 'reject' || action === 'need_more_info') && !socialActionMessage.trim()) {
      toast.error('Please provide a message');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/social-verification-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true'
        },
        body: JSON.stringify({
          requestId: selectedSocialRequest.id,
          action,
          adminId: 'admin-user', // TODO: Get from session
          message: socialActionMessage || undefined,
          followerCount: action === 'approve' ? followerCount : undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setSelectedSocialRequest(null);
        setSocialActionMessage('');
        setFollowerCount(undefined);
        fetchAllData(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error?.message || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing social verification:', error);
      toast.error('Error processing request');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading pending approvals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600">Review and manage business, influencer, and social verification approvals</p>
      </div>

      {pendingApprovals.length === 0 && socialVerificationRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
            <p className="text-gray-600 text-center">All accounts and social verifications have been reviewed. New requests will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Social Verification Requests */}
          {socialVerificationRequests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Social Verification Requests</h2>
              <div className="grid gap-4">
                {socialVerificationRequests.filter(req => req.status === 'pending').map((request) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <User className="h-8 w-8 text-purple-600" />
                          <div>
                            <CardTitle className="text-lg">{request.handle}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              {request.platform.charAt(0).toUpperCase() + request.platform.slice(1)} verification
                              <span>•</span>
                              <span>User ID: {request.userId}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Clock className="w-3 h-3 mr-1" />Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Requested: {formatDate(request.requestedAt)}</span>
                        </div>
                        {request.followerCount && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{request.followerCount.toLocaleString()} followers</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => setSelectedSocialRequest(request)}
                              disabled={actionLoading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Social Verification</DialogTitle>
                              <DialogDescription>
                                Approve {request.handle} for {request.platform} verification. This will activate their account.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="follower-count">Follower Count (Optional)</Label>
                                <input
                                  id="follower-count"
                                  type="number"
                                  placeholder="Enter follower count"
                                  value={followerCount || ''}
                                  onChange={(e) => setFollowerCount(e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                              <div>
                                <Label htmlFor="approval-message">Message (Optional)</Label>
                                <Textarea
                                  id="approval-message"
                                  placeholder="Optional message for the user..."
                                  value={socialActionMessage}
                                  onChange={(e) => setSocialActionMessage(e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => {
                                setSelectedSocialRequest(null);
                                setSocialActionMessage('');
                                setFollowerCount(undefined);
                              }}>
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleSocialVerificationAction('approve')}
                                disabled={actionLoading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading ? 'Approving...' : 'Approve'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              onClick={() => setSelectedSocialRequest(request)}
                              disabled={actionLoading}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Social Verification</DialogTitle>
                              <DialogDescription>
                                Reject {request.handle} for {request.platform} verification. Please provide a reason.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="rejection-message">Rejection Reason</Label>
                                <Textarea
                                  id="rejection-message"
                                  placeholder="Please explain why this verification is being rejected..."
                                  value={socialActionMessage}
                                  onChange={(e) => setSocialActionMessage(e.target.value)}
                                  rows={4}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => {
                                setSelectedSocialRequest(null);
                                setSocialActionMessage('');
                              }}>
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleSocialVerificationAction('reject')}
                                disabled={actionLoading || !socialActionMessage.trim()}
                              >
                                {actionLoading ? 'Rejecting...' : 'Reject'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedSocialRequest(request)}
                              disabled={actionLoading}
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Need More Info
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Request More Information</DialogTitle>
                              <DialogDescription>
                                Request more information from {request.handle} for {request.platform} verification.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="more-info-message">Message to User</Label>
                                <Textarea
                                  id="more-info-message"
                                  placeholder="Please provide additional information or documentation..."
                                  value={socialActionMessage}
                                  onChange={(e) => setSocialActionMessage(e.target.value)}
                                  rows={4}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => {
                                setSelectedSocialRequest(null);
                                setSocialActionMessage('');
                              }}>
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleSocialVerificationAction('need_more_info')}
                                disabled={actionLoading || !socialActionMessage.trim()}
                              >
                                {actionLoading ? 'Sending...' : 'Send Request'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Business and Influencer Approvals */}
          {pendingApprovals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Approvals</h2>
              <div className="grid gap-6">
                {pendingApprovals.map((approval) => (
            <Card key={approval.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {approval.type === 'business' ? (
                      <Building2 className="h-8 w-8 text-blue-600" />
                    ) : (
                      <User className="h-8 w-8 text-purple-600" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{approval.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {approval.email}
                        {approval.businessName && (
                          <>
                            <span>•</span>
                            <span>{approval.businessName}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(approval.approvalStatus)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Applied: {formatDate(approval.createdAt)}</span>
                  </div>
                  {approval.type === 'influencer' && approval.followers && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{approval.followers.toLocaleString()} followers</span>
                      {approval.tier && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary">{approval.tier}</Badge>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {approval.socialMedia && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Social Media:</p>
                    <div className="flex gap-2">
                      {approval.socialMedia.instagram && (
                        <Badge variant="outline">Instagram: @{approval.socialMedia.instagram}</Badge>
                      )}
                      {approval.socialMedia.tiktok && (
                        <Badge variant="outline">TikTok: @{approval.socialMedia.tiktok}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {approval.canReapplyAt && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Cooldown Period</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Can reapply after: {formatDate(approval.canReapplyAt)}
                    </p>
                  </div>
                )}

                {approval.approvalHistory && approval.approvalHistory.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Approval History:</p>
                    <div className="space-y-2">
                      {approval.approvalHistory.map((history, index) => (
                        <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <span className="font-medium">{history.action}</span> by {history.adminId}
                          <span className="text-gray-500"> • {formatDate(history.timestamp)}</span>
                          {history.reason && (
                            <p className="mt-1 text-gray-700">Reason: {history.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {approval.approvalStatus === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(approval)}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          onClick={() => setSelectedApproval(approval)}
                          disabled={actionLoading}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject {approval.type === 'business' ? 'Business' : 'Influencer'}</DialogTitle>
                          <DialogDescription>
                            Please provide a reason for rejecting {approval.name}. They will be able to reapply after 24 hours.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="rejection-reason">Rejection Reason</Label>
                            <Textarea
                              id="rejection-reason"
                              placeholder="Please explain why this application is being rejected..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={4}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {
                            setSelectedApproval(null);
                            setRejectionReason('');
                          }}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={actionLoading || !rejectionReason.trim()}
                          >
                            {actionLoading ? 'Rejecting...' : 'Reject Application'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
