'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Instagram, Music, Users, Verified } from 'lucide-react';
import { useSocialConnect } from '@/lib/hooks/use-social-connect';

interface SocialConnectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SocialConnectDialog({ open, onClose }: SocialConnectDialogProps) {
  const { connectInstagram, connectTikTok, loading } = useSocialConnect();
  const [connectingPlatform, setConnectingPlatform] = useState<'instagram' | 'tiktok' | null>(null);

  const handleInstagramConnect = async () => {
    setConnectingPlatform('instagram');
    
    // In a real implementation, this would use Instagram's OAuth flow
    // For now, we'll simulate the connection with mock data
    const mockAccessToken = 'mock_ig_token';
    const mockUserId = 'mock_ig_user_id';
    
    const result = await connectInstagram(mockAccessToken, mockUserId);
    
    if (result?.success) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
    
    setConnectingPlatform(null);
  };

  const handleTikTokConnect = async () => {
    setConnectingPlatform('tiktok');
    
    // In a real implementation, this would use TikTok's OAuth flow
    // For now, we'll simulate the connection with mock data
    const mockAccessToken = 'mock_tiktok_token';
    const mockOpenId = 'mock_tiktok_open_id';
    
    const result = await connectTikTok(mockAccessToken, mockOpenId);
    
    if (result?.success) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
    
    setConnectingPlatform(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connect Your Social Media
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Connect your social media accounts to automatically upgrade your tier and unlock better campaigns.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-600" />
                  Instagram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Follower count tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Verified className="w-4 h-4" />
                    <span>Verification status</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">TIER THRESHOLDS</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Bronze:</span>
                      <span>&lt; 10K followers</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Silver:</span>
                      <span>10K+ followers</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gold:</span>
                      <span>50K+ followers</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platinum:</span>
                      <span>100K+ or verified</span>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={handleInstagramConnect}
                  disabled={loading}
                >
                  {connectingPlatform === 'instagram' ? 'Connecting...' : 'Connect Instagram'}
                </Button>
              </CardContent>
            </Card>

            {/* TikTok Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-black" />
                  TikTok
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Follower count tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Verified className="w-4 h-4" />
                    <span>Verification status</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">TIER THRESHOLDS</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Bronze:</span>
                      <span>&lt; 10K followers</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Silver:</span>
                      <span>10K+ followers</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gold:</span>
                      <span>50K+ followers</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platinum:</span>
                      <span>100K+ or verified</span>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={handleTikTokConnect}
                  disabled={loading}
                >
                  {connectingPlatform === 'tiktok' ? 'Connecting...' : 'Connect TikTok'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <div className="font-medium text-blue-800 mb-1">Higher tiers unlock better campaigns</div>
                <div className="text-blue-700">
                  Connect your social media to automatically upgrade your tier based on your follower count and verification status.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
