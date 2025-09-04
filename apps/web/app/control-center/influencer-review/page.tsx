'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Search, Check, X, Eye, Instagram, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface InfluencerReview {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  tier: string;
  followerCount: number;
  socialMedia: {
    instagram?: { username: string; followers: number; verified: boolean };
    tiktok?: { username: string; followers: number; verified: boolean };
  };
  applicationDate: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export default function InfluencerReviewPage() {
  const [influencers, setInfluencers] = useState<InfluencerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerReview | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const loadInfluencers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/influencers/review-queue');
      if (!response.ok) throw new Error('Failed to fetch influencers');
      const data = await response.json();
      setInfluencers(data.influencers || []);
    } catch (error) {
      console.error('Error loading influencers:', error);
      toast.error('Failed to load influencer review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfluencers();
  }, []);

  const filteredInfluencers = influencers.filter(influencer => 
    influencer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    influencer.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingInfluencers = filteredInfluencers.filter(inf => inf.status === 'pending');
  const reviewedInfluencers = filteredInfluencers.filter(inf => inf.status !== 'pending');

  const handleApprove = async (influencerId: string) => {
    try {
      setProcessingAction(influencerId);
      const response = await fetch('/api/admin/influencers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId })
      });

      if (!response.ok) throw new Error('Failed to approve influencer');
      
      toast.success('Influencer approved successfully');
      await loadInfluencers();
    } catch (error) {
      console.error('Error approving influencer:', error);
      toast.error('Failed to approve influencer');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (influencerId: string, reason: string) => {
    try {
      setProcessingAction(influencerId);
      const response = await fetch('/api/admin/influencers/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerId, reason })
      });

      if (!response.ok) throw new Error('Failed to reject influencer');
      
      toast.success('Influencer rejected');
      await loadInfluencers();
      setShowReviewDialog(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting influencer:', error);
      toast.error('Failed to reject influencer');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = pendingInfluencers.map(inf => inf.id);
    if (pendingIds.length === 0) return;

    try {
      setProcessingAction('bulk');
      const response = await fetch('/api/admin/influencers/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencerIds: pendingIds })
      });

      if (!response.ok) throw new Error('Failed to bulk approve');
      
      toast.success(`Approved ${pendingIds.length} influencers`);
      await loadInfluencers();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Failed to bulk approve influencers');
    } finally {
      setProcessingAction(null);
    }
  };

  const openRejectDialog = (influencer: InfluencerReview) => {
    setSelectedInfluencer(influencer);
    setShowReviewDialog(true);
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'nano': return 'bg-gray-100 text-gray-800';
      case 'micro': return 'bg-blue-100 text-blue-800';
      case 'mid': return 'bg-purple-100 text-purple-800';
      case 'macro': return 'bg-orange-100 text-orange-800';
      case 'mega': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFollowerCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Influencer Review Queue</h1>
        <div className="flex gap-2">
          {pendingInfluencers.length > 0 && (
            <Button 
              onClick={handleBulkApprove}
              disabled={processingAction === 'bulk'}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingAction === 'bulk' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve All ({pendingInfluencers.length})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Reviews */}
          {pendingInfluencers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Pending Reviews ({pendingInfluencers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Influencer</th>
                        <th className="text-left p-3">Tier</th>
                        <th className="text-left p-3">Social Media</th>
                        <th className="text-left p-3">Applied</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInfluencers.map((influencer) => (
                        <tr key={influencer.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden">
                                {influencer.photoURL ? (
                                  <img src={influencer.photoURL} alt={influencer.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white">
                                    {(influencer.displayName || influencer.email)?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{influencer.displayName || 'Unnamed'}</div>
                                <div className="text-sm text-gray-500">{influencer.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={getTierColor(influencer.tier)}>
                              {influencer.tier}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {influencer.socialMedia.instagram && (
                                <div className="flex items-center text-sm">
                                  <Instagram className="w-4 h-4 mr-1" />
                                  @{influencer.socialMedia.instagram.username}
                                  <span className="ml-2 text-gray-500">
                                    {formatFollowerCount(influencer.socialMedia.instagram.followers)}
                                  </span>
                                  {influencer.socialMedia.instagram.verified && (
                                    <Check className="w-3 h-3 ml-1 text-blue-500" />
                                  )}
                                </div>
                              )}
                              {influencer.socialMedia.tiktok && (
                                <div className="flex items-center text-sm">
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  @{influencer.socialMedia.tiktok.username}
                                  <span className="ml-2 text-gray-500">
                                    {formatFollowerCount(influencer.socialMedia.tiktok.followers)}
                                  </span>
                                  {influencer.socialMedia.tiktok.verified && (
                                    <Check className="w-3 h-3 ml-1 text-blue-500" />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {new Date(influencer.applicationDate).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(influencer.id)}
                                disabled={processingAction === influencer.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {processingAction === influencer.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRejectDialog(influencer)}
                                disabled={processingAction === influencer.id}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviewed Influencers */}
          {reviewedInfluencers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Reviewed ({reviewedInfluencers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Influencer</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Reviewed</th>
                        <th className="text-left p-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewedInfluencers.map((influencer) => (
                        <tr key={influencer.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 overflow-hidden">
                                {influencer.photoURL ? (
                                  <img src={influencer.photoURL} alt={influencer.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white text-sm">
                                    {(influencer.displayName || influencer.email)?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{influencer.displayName || 'Unnamed'}</div>
                                <div className="text-sm text-gray-500">{influencer.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={influencer.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {influencer.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {influencer.reviewedAt ? new Date(influencer.reviewedAt).toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600">
                              {influencer.rejectionReason || (influencer.status === 'approved' ? 'Approved' : '-')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredInfluencers.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No influencers found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search term' : 'No influencers in the review queue'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Influencer Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Rejecting application for: <strong>{selectedInfluencer?.displayName || selectedInfluencer?.email}</strong></p>
            <Textarea
              placeholder="Please provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedInfluencer && handleReject(selectedInfluencer.id, rejectionReason)}
                disabled={!rejectionReason.trim() || processingAction === selectedInfluencer?.id}
                className="bg-red-600 hover:bg-red-700"
              >
                {processingAction === selectedInfluencer?.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Reject Application'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
