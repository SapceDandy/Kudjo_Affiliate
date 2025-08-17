'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ClaimOfferDialogProps {
  offerId: string;
  open: boolean;
  onClose: () => void;
}

export function ClaimOfferDialog({ offerId, open, onClose }: ClaimOfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; qrUrl: string } | null>(null);

  const handleClaim = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/coupon.claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });
      if (!res.ok) throw new Error('Failed to claim coupon');
      const data = await res.json();
      setCoupon(data);
    } catch (err) {
      setError('Failed to claim coupon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Content Coupon</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!coupon ? (
            <>
              <p className="text-sm text-muted-foreground">
                By claiming this coupon, you agree to create content featuring this business
                and share it on your social media platforms.
              </p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                className="w-full"
                onClick={handleClaim}
                disabled={loading}
              >
                {loading ? 'Claiming...' : 'Claim Coupon'}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="relative w-64 h-64 mx-auto">
                <Image
                  src={coupon.qrUrl}
                  alt="Coupon QR Code"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Your Coupon Code:</p>
                <p className="text-lg font-mono">{coupon.code}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Present this QR code or enter the code at checkout to redeem your offer.
                This is a single-use coupon.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 