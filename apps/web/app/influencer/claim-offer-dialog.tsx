'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAnalytics } from '@/components/analytics';

interface ClaimOfferDialogProps {
  offerId: string;
  open: boolean;
  onClose: () => void;
}

interface CampaignData {
  affiliateLink: {
    url: string;
    qrUrl: string;
    shortCode: string;
  };
  contentCoupon: {
    code: string;
    qrUrl: string;
    couponId: string;
  };
}

export function ClaimOfferDialog({ offerId, open, onClose }: ClaimOfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const { user } = useAuth();
  const { trackCampaignStart, trackCouponClaim } = useAnalytics();

  const handleStartCampaign = async () => {
    if (!user) {
      setError('Please sign in to start a campaign.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create affiliate link (coupon) - bizId will be looked up from offer
      const affiliateRes = await fetch('/api/coupon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'AFFILIATE',
          offerId, 
          infId: user.uid,
          bizId: 'lookup-from-offer' // Backend will replace this
        }),
      });

      if (!affiliateRes.ok) {
        const errorData = await affiliateRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create affiliate link');
      }

      const affiliateData = await affiliateRes.json();

      // Create content coupon
      const couponRes = await fetch('/api/coupon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'CONTENT_MEAL',
          offerId, 
          infId: user.uid,
          bizId: 'lookup-from-offer' // Backend will replace this
        }),
      });

      if (!couponRes.ok) {
        throw new Error('Failed to create content coupon');
      }

      const couponData = await couponRes.json();

      // Combine both pieces of data
      setCampaignData({
        affiliateLink: {
          url: affiliateData.link?.url || '',
          qrUrl: affiliateData.link?.qrUrl || '',
          shortCode: affiliateData.link?.linkId || affiliateData.couponId
        },
        contentCoupon: {
          code: couponData.code,
          qrUrl: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/qr/${couponData.couponId}`,
          couponId: couponData.couponId
        }
      });

              // Track analytics events
        trackCouponClaim('AFFILIATE', offerId);
        trackCouponClaim('CONTENT_MEAL', offerId);
        trackCampaignStart(offerId, 'business-id-from-offer');

    } catch (err) {
      console.error('Campaign creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const resetDialog = () => {
    setCampaignData(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {campaignData ? 'Campaign Started!' : 'Start Campaign'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!campaignData ? (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  By starting this campaign, you agree to:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Create content featuring this business within 1 week</li>
                  <li>Share the content on your social media platforms</li>
                  <li>Follow all posting requirements and guidelines</li>
                  <li>Use your unique affiliate link when promoting</li>
                </ul>
                <p className="text-sm font-medium">
                  You'll receive both an affiliate link for earning commissions and a content coupon for your free meal.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <Button
                className="w-full"
                onClick={handleStartCampaign}
                disabled={loading}
              >
                {loading ? 'Starting Campaign...' : 'Start Campaign'}
              </Button>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">
                🎉 Campaign started successfully! You now have both your affiliate link and content coupon.
              </div>

              <Tabs defaultValue="affiliate" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="affiliate">Affiliate Link</TabsTrigger>
                  <TabsTrigger value="coupon">Content Coupon</TabsTrigger>
                </TabsList>

                <TabsContent value="affiliate">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Your Affiliate Link
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Share this link to earn commissions:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">
                            {campaignData.affiliateLink.url}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(campaignData.affiliateLink.url)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <div className="relative w-48 h-48">
                          <Image
                            src={campaignData.affiliateLink.qrUrl}
                            alt="Affiliate Link QR Code"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Share this QR code or link with your followers to earn commissions on their purchases.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="coupon">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5" />
                        Your Content Coupon
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Your free meal coupon code:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-lg font-mono text-center">
                            {campaignData.contentCoupon.code}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(campaignData.contentCoupon.code)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <div className="relative w-48 h-48">
                          <Image
                            src={campaignData.contentCoupon.qrUrl}
                            alt="Content Coupon QR Code"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Present this QR code or coupon code when you visit the restaurant. Single use only.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={resetDialog}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => window.open('/influencer/dashboard', '_blank')}
                >
                  View Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 