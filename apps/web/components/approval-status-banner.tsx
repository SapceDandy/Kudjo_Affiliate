'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface ApprovalStatusBannerProps {
  userType: 'business' | 'influencer';
  userId: string;
  className?: string;
}

interface ApprovalStatus {
  approved: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  canReapplyAt?: string;
  approvalHistory?: Array<{
    action: string;
    adminId: string;
    timestamp: string;
    reason?: string;
  }>;
}

export function ApprovalStatusBanner({ userType, userId, className }: ApprovalStatusBannerProps) {
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeUntilReapply, setTimeUntilReapply] = useState<string>('');

  const fetchApprovalStatus = async () => {
    try {
      const endpoint = userType === 'business' ? '/api/business/profile' : '/api/influencer/profile';
      const response = await fetch(`${endpoint}?uid=${userId}`);
      
      if (response.ok) {
        const responseData = await response.json();
        // Handle both old format (direct data) and new format (wrapped in success/profile)
        const data = responseData.profile || responseData;
        
        // Determine approval status from available fields
        let approvalStatus: 'pending' | 'approved' | 'rejected' = 'pending';
        if (data.approved === true) {
          approvalStatus = 'approved';
        } else if (data.status === 'approved') {
          approvalStatus = 'approved';
        } else if (data.status === 'rejected') {
          approvalStatus = 'rejected';
        }
        
        setApprovalStatus({
          approved: data.approved || data.status === 'approved' || false,
          approvalStatus: approvalStatus,
          canReapplyAt: data.canReapplyAt,
          approvalHistory: data.approvalHistory || []
        });
      }
    } catch (error) {
      console.error('Error fetching approval status:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeUntilReapply = () => {
    if (!approvalStatus?.canReapplyAt) return '';
    
    const reapplyTime = new Date(approvalStatus.canReapplyAt);
    const now = new Date();
    const diff = reapplyTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'You can now reapply';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  useEffect(() => {
    fetchApprovalStatus();
  }, [userType, userId]);

  useEffect(() => {
    if (approvalStatus?.canReapplyAt) {
      const interval = setInterval(() => {
        setTimeUntilReapply(calculateTimeUntilReapply());
      }, 60000); // Update every minute

      // Initial calculation
      setTimeUntilReapply(calculateTimeUntilReapply());

      return () => clearInterval(interval);
    }
  }, [approvalStatus?.canReapplyAt]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (!approvalStatus || approvalStatus.approvalStatus === 'approved') {
    return null; // Don't show banner for approved users
  }

  const getLastRejectionReason = () => {
    if (!approvalStatus.approvalHistory) return null;
    
    const rejections = approvalStatus.approvalHistory
      .filter(h => h.action === 'rejected')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return rejections[0]?.reason || null;
  };

  const renderPendingStatus = () => (
    <Alert className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                <Clock className="w-3 h-3 mr-1" />
                Pending Review
              </Badge>
            </div>
            <p className="font-medium">Your {userType} account is under review</p>
            <p className="text-sm text-yellow-700 mt-1">
              Our team is reviewing your application. You'll receive an email notification once approved.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApprovalStatus}
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  const renderRejectedStatus = () => {
    const rejectionReason = getLastRejectionReason();
    const canReapply = !approvalStatus.canReapplyAt || new Date(approvalStatus.canReapplyAt) <= new Date();

    return (
      <Alert className={`border-red-200 bg-red-50 ${className}`}>
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                  <XCircle className="w-3 h-3 mr-1" />
                  Application Rejected
                </Badge>
                {!canReapply && timeUntilReapply && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeUntilReapply}
                  </Badge>
                )}
              </div>
              <p className="font-medium">Your {userType} application was not approved</p>
              {rejectionReason && (
                <div className="mt-2 p-2 bg-red-100 rounded border border-red-200">
                  <p className="text-sm font-medium text-red-800">Reason:</p>
                  <p className="text-sm text-red-700">{rejectionReason}</p>
                </div>
              )}
              <p className="text-sm text-red-700 mt-2">
                {canReapply 
                  ? 'You can now submit a new application addressing the feedback above.'
                  : `You can reapply in ${timeUntilReapply}. Please address the feedback above before reapplying.`
                }
              </p>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchApprovalStatus}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              {canReapply && (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    // TODO: Navigate to registration/reapplication form
                    window.location.href = userType === 'business' ? '/business/register' : '/influencer/register';
                  }}
                >
                  Reapply Now
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  switch (approvalStatus.approvalStatus) {
    case 'pending':
      return renderPendingStatus();
    case 'rejected':
      return renderRejectedStatus();
    default:
      return null;
  }
}
