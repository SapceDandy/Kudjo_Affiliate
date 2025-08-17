import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './roles';
import { asyncHandler } from './utils';
import { handleBusinessCreate } from '../apis/business.create';
import { handleBusinessPosConnect } from '../apis/business.pos.connect';
import { handleOfferCreate } from '../apis/offer.create';
import { handleCouponClaim } from '../apis/coupon.claim';
import { handleLinkCreate } from '../apis/link.create';
import { handleEarningsSummary } from '../apis/earnings.summary';
import { handleOutlookConnect } from '../apis/admin.outreach.connectOutlook';
import { handleOutreachSend } from '../apis/admin.outreach.send';
import { handleOutreachWebhook } from '../apis/admin.outreach.webhook';
import { handleSquareWebhook } from '../integrations/square/webhooks';

// Inline schemas for testing
const ApiBusinessCreate = z.object({
  name: z.string().min(2),
  address: z.string(),
  posProvider: z.enum(['square', 'manual', 'clover']),
  defaultSplitPct: z.number().min(0).max(100),
});

const ApiBusinessPosConnect = z.object({
  bizId: z.string(),
  provider: z.enum(['square', 'manual', 'clover']).default('manual'),
  code: z.string().optional(),
  credentials: z.record(z.any()).optional(),
});

export const router = Router();

router.post('/business.create', requireRole('business'), asyncHandler(handleBusinessCreate, ApiBusinessCreate));
router.post('/business.pos.connect', requireRole('business'), asyncHandler(handleBusinessPosConnect, ApiBusinessPosConnect));
router.post('/offer.create', requireRole('business'), asyncHandler(handleOfferCreate));
router.post('/coupon.claim', requireRole('influencer'), asyncHandler(handleCouponClaim));
router.post('/link.create', requireRole('influencer'), asyncHandler(handleLinkCreate));
router.get('/earnings.summary', requireRole('influencer'), asyncHandler(handleEarningsSummary));

router.post('/redemption.webhook/square', asyncHandler(handleSquareWebhook));

router.post('/admin.outreach.connectOutlook', requireRole('admin'), asyncHandler(handleOutlookConnect));
router.post('/admin.outreach.send', requireRole('admin'), asyncHandler(handleOutreachSend));
router.post('/admin.outreach.webhook', requireRole('admin'), asyncHandler(handleOutreachWebhook)); 