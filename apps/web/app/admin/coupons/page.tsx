'use client';

import { useState } from 'react';
import { CouponsTable } from '@/components/admin/coupons-table';
import { CouponDetailDrawer } from '@/components/admin/coupon-detail-drawer';

interface Coupon {
  id: string;
  type: 'AFFILIATE' | 'CONTENT_MEAL';
  bizId: string;
  infId: string;
  offerId: string;
  code: string;
  status: 'issued' | 'active' | 'redeemed' | 'expired';
  cap_cents?: number;
  deadlineAt?: string;
  createdAt: string;
  admin: {
    posAdded: boolean;
    posAddedAt?: string;
    notes?: string;
  };
  business?: {
    name: string;
  };
  influencer?: {
    handle: string;
  };
}

export default function AdminCouponsPage() {
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <CouponsTable onCouponSelect={setSelectedCoupon} />
      
      {/* Enhanced Coupon Detail Drawer */}
      <CouponDetailDrawer 
        coupon={selectedCoupon} 
        onClose={() => setSelectedCoupon(null)} 
      />
    </div>
  );
} 