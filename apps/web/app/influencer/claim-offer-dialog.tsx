'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAnalytics } from '@/components/analytics';
import toast from 'react-hot-toast';

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
  const [legalAccepted, setLegalAccepted] = useState(false);
  const { user } = useAuth();
  const { trackCampaignStart, trackCouponClaim } = useAnalytics();

  const handleStartCampaign = async () => {
    if (!user) {
      setError('Please sign in to start a campaign.');
      return;
    }

    if (!legalAccepted) {
      setError('Please accept the legal terms to continue.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Use new JOIN CAMPAIGN API
      const response = await fetch('/api/influencer/join-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          infId: user.uid,
          legalAccepted: true,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to join campaign');
      }

      setCampaignData({
        affiliateLink: {
          url: result.coupons.affiliate.linkUrl,
          qrUrl: result.coupons.affiliate.qrUrl,
          shortCode: result.coupons.affiliate.linkId,
        },
        contentCoupon: {
          code: result.coupons.contentMeal.code,
          qrUrl: result.coupons.contentMeal.qrUrl,
          couponId: result.coupons.contentMeal.id,
        },
      });

      // Track analytics events
      trackCouponClaim('AFFILIATE', offerId);
      trackCouponClaim('CONTENT_MEAL', offerId);
      trackCampaignStart(offerId, 'business-id-from-offer');

      // Show success toast
      toast.success('Campaign started! You now have both your affiliate link and content coupon.');

    } catch (err) {
      console.error('Campaign creation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start campaign. Please try again.';
      setError(errorMessage);
      
      // Show error toast
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Unable to copy to clipboard.');
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

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="legal-terms"
                    checked={legalAccepted}
                    onCheckedChange={(checked) => setLegalAccepted(checked === true)}
                  />
                  <label htmlFor="legal-terms" className="text-sm leading-relaxed">
                    I agree to post content within 7 days and keep it posted for 7-14 days as required by the campaign terms.
                  </label>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={handleStartCampaign}
                disabled={loading || !legalAccepted}
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
                        {campaignData && (
                          <div className="relative w-48 h-48">
                            <Image
                              src={campaignData.affiliateLink.qrUrl}
                              alt="Affiliate Link QR Code"
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
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
                            {campaignData?.contentCoupon.code}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => campaignData && copyToClipboard(campaignData.contentCoupon.code)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        {campaignData && (
                          <div className="relative w-48 h-48">
                            <Image
                              src={campaignData.contentCoupon.qrUrl}
                              alt="Content Coupon QR Code"
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
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
                  onClick={() => window.open('/influencer', '_blank')}
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