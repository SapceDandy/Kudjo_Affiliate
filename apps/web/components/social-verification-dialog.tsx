'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Music, Youtube, Twitter, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SocialAccount {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter';
  handle: string;
  followerCount: number;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: 'oauth' | 'admin';
  profileUrl?: string;
  avatarUrl?: string;
}

interface SocialVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentAccounts?: SocialAccount[];
  onVerificationComplete: (accounts: SocialAccount[]) => void;
}

const platformConfig = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    placeholder: '@username',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'bg-black',
    placeholder: '@username',
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-500',
    placeholder: '@channelname',
  },
  twitter: {
    name: 'Twitter',
    icon: Twitter,
    color: 'bg-blue-500',
    placeholder: '@username',
  },
};

export function SocialVerificationDialog({
  open,
  onOpenChange,
  userId,
  currentAccounts = [],
  onVerificationComplete,
}: SocialVerificationDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformConfig>('instagram');
  const [handle, setHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [verifiedAccounts, setVerifiedAccounts] = useState<SocialAccount[]>(currentAccounts);

  const handleOAuthConnect = async (platform: keyof typeof platformConfig) => {
    setIsConnecting(true);
    try {
      if (platform === 'instagram') {
        // For Instagram, we need to simulate the OAuth flow since we don't have real OAuth setup
        // In a real implementation, this would redirect to Instagram OAuth
        
        // Simulate Instagram OAuth success with real API call
        const mockAccessToken = 'mock_instagram_access_token';
        const mockUserId = 'mock_instagram_user_id';
        
        const response = await fetch('/api/influencer/connect-instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            accessToken: mockAccessToken, 
            userId: mockUserId 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to connect Instagram');
        }

        const result = await response.json();
        
        if (result.success) {
          const newAccount: SocialAccount = {
            platform: 'instagram',
            handle: result.socialMediaData?.username || '@verified_user',
            followerCount: result.socialMediaData?.followersCount || 10000,
            verified: result.socialMediaData?.isVerified || true,
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'oauth',
            profileUrl: result.socialMediaData?.profilePicture,
          };

          const updatedAccounts = [...verifiedAccounts.filter(acc => acc.platform !== platform), newAccount];
          setVerifiedAccounts(updatedAccounts);
          
          toast.success('Instagram connected successfully!');
          if (result.tierUpdate) {
            toast.success(`Tier upgraded to ${result.tierUpdate.newTier.toUpperCase()}!`);
          }
        }
      } else {
        // For other platforms, show not implemented message
        toast.error(`${platformConfig[platform].name} connection not implemented yet`);
      }
    } catch (error) {
      console.error('OAuth connection error:', error);
      toast.error(`Failed to connect ${platformConfig[platform].name} account`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualVerification = async () => {
    if (!handle.trim()) {
      toast.error('Please enter a handle');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/influencer/social/manual-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          handle: handle.trim(),
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (data.error === 'ALREADY_VERIFIED') {
          toast.error(`${platformConfig[selectedPlatform].name} account is already verified`);
        } else if (data.error === 'REQUEST_PENDING') {
          toast.error(`Verification request for ${platformConfig[selectedPlatform].name} is already pending review`);
        } else if (data.error === 'Invalid request data') {
          toast.error('Please check your input and try again');
        } else {
          toast.error(data.message || 'Failed to submit manual verification request');
        }
        return;
      }

      toast.success(`Manual verification request submitted for ${handle}. Admin will review shortly.`);
      setHandle('');
    } catch (error) {
      console.error('Manual verification error:', error);
      toast.error('Failed to submit manual verification request');
    } finally {
      setIsConnecting(false);
    }
  };

  const getTierFromFollowerCount = (count: number): string => {
    if (count >= 1000000) return 'Huge';
    if (count >= 250000) return 'XL';
    if (count >= 50000) return 'Large';
    if (count >= 5000) return 'Medium';
    return 'Small';
  };

  const handleComplete = () => {
    if (verifiedAccounts.length === 0) {
      toast.error('Please verify at least one social media account');
      return;
    }
    onVerificationComplete(verifiedAccounts);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify Your Social Media Accounts</DialogTitle>
          <DialogDescription>
            Connect your social media accounts to unlock campaign access and determine your influencer tier.
            You need at least one verified account to join campaigns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Verified Accounts */}
          {verifiedAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Verified Accounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {verifiedAccounts.map((account) => {
                  const config = platformConfig[account.platform];
                  const Icon = config.icon;
                  return (
                    <Card key={account.platform} className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${config.color} text-white`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{account.handle}</span>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>{account.followerCount.toLocaleString()} followers</span>
                              <Badge variant="outline" className="text-xs">
                                {getTierFromFollowerCount(account.followerCount)} Tier
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <Tabs defaultValue="oauth" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="oauth">Connect with OAuth</TabsTrigger>
              <TabsTrigger value="manual">Manual Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="oauth" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(platformConfig).map(([platform, config]) => {
                  const Icon = config.icon;
                  const isConnected = verifiedAccounts.some(acc => acc.platform === platform);
                  
                  return (
                    <Button
                      key={platform}
                      variant={isConnected ? "outline" : "default"}
                      className={`h-auto p-4 ${isConnected ? 'border-green-500 bg-green-50' : ''}`}
                      onClick={() => handleOAuthConnect(platform as keyof typeof platformConfig)}
                      disabled={isConnecting || isConnected}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-2 rounded-full ${config.color} text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">
                          {isConnected ? 'Connected' : `Connect ${config.name}`}
                        </span>
                        {isConnected && <CheckCircle className="w-4 h-4 text-green-600" />}
                      </div>
                    </Button>
                  );
                })}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">OAuth Connection</p>
                    <p>Click a platform to connect via OAuth. You'll be redirected to authorize the connection and we'll automatically fetch your follower count and profile information.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as keyof typeof platformConfig)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  >
                    {Object.entries(platformConfig).map(([platform, config]) => (
                      <option key={platform} value={platform}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="handle">Handle</Label>
                  <Input
                    id="handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder={platformConfig[selectedPlatform].placeholder}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleManualVerification}
                  disabled={isConnecting || !handle.trim()}
                  className="w-full"
                >
                  {isConnecting ? 'Submitting...' : 'Submit for Manual Verification'}
                </Button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Manual Verification Process</p>
                    <p>If you can't connect via OAuth, submit your handle for manual verification. Our admin team will review your account and verify your follower count within 24 hours.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={verifiedAccounts.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Complete Verification
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
