import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import QRCode from 'qrcode';
import { generateShortCode, nowIso } from '../utils/shared';

const CouponClaimSchema = z.object({
  offerId: z.string().min(1, 'Offer ID is required'),
  infId: z.string().min(1, 'Influencer ID is required'),
});

export async function handleCouponClaim(req: Request, res: Response) {
  try {
    const { offerId, infId } = CouponClaimSchema.parse(req.body);
    const offer = await admin.firestore().doc(`offers/${offerId}`).get();
    if (!offer.exists) {
      return res.status(404).json({ error: 'not_found' });
    }
    const code = generateShortCode(8);
    const url = `${process.env.PUBLIC_URL || 'https://example.com'}/r/${code}`;
    const qrUrl = await QRCode.toDataURL(url);
    const coupon = await admin.firestore().collection('contentCoupons').add({
      bizId: offer.get('bizId'),
      infId,
      offerId,
      code,
      qrUrl,
      singleUse: true,
      status: 'issued',
      rules: offer.get('rules') || {},
      createdAt: nowIso(),
    });
    res.json({ couponId: coupon.id, code, qrUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: error.flatten() 
      });
    }
    
    console.error('Error claiming coupon:', error);
    res.status(500).json({ error: 'internal_server_error' });
  }
} 