import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './roles';
import { asyncHandler } from './utils';
import { handleBusinessCreate } from '../apis/business.create';
import { handleBusinessPosConnect } from '../apis/business.pos.connect';
import { handleOfferCreate } from '../apis/offer.create';
import { handleCouponClaim } from '../apis/coupon.claim';
import { handleLinkCreate } from '../apis/link.create';
import { handlePostSubmit } from '../apis/post.submit';
import { handleEarningsSummary } from '../apis/earnings.summary';
import { handleOutlookConnect } from '../apis/admin.outreach.connectOutlook';
import { handleOutreachSend } from '../apis/admin.outreach.send';
import { handleOutreachWebhook } from '../apis/admin.outreach.webhook';
import { handleSquareWebhook } from '../integrations/square/webhooks';
import { handlePayoutSummary } from '../apis/payout.ledger';
import { handleInfluencerOAuthStart } from '../apis/influencer.oauth.start';
import { handleOfferSuggest } from '../apis/offer.suggest';
import admin from 'firebase-admin';

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
router.post('/post.submit', requireRole('influencer'), asyncHandler(handlePostSubmit));
router.get('/earnings.summary', requireRole('influencer'), asyncHandler(handleEarningsSummary));
router.get('/payout.summary', requireRole('influencer'), asyncHandler(handlePayoutSummary));
router.get('/influencer.oauth.start', asyncHandler(handleInfluencerOAuthStart));
router.get('/offer.suggest', requireRole('business'), asyncHandler(handleOfferSuggest));

// Affiliate click router: /a/:token -> logs event and redirects to app landing
router.get('/a/:token', async (req, res, next) => {
  try {
    const token = req.params.token;
    const db = admin.firestore();
    const linkSnap = await db.collection('affiliateLinks').where('token', '==', token).limit(1).get();
    if (linkSnap.empty) {
      res.status(404).send('Not found');
      return;
    }
    const link = linkSnap.docs[0].data();
    // Log event
    await db.collection('events').add({
      event: 'affiliate_click',
      userId: link.infId,
      payload: {
        token,
        offerId: link.offerId,
        bizId: link.bizId,
        ua: req.headers['user-agent'] || '',
        ip: (req.headers['x-forwarded-for'] as string) || req.ip,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
      },
      timestamp: new Date().toISOString(),
    });
    // Redirect to web app deal page (fallback to home)
    const base = process.env.PUBLIC_URL || 'http://localhost:3000';
    const dest = `${base}/r/${link.token}`;
    res.redirect(302, dest);
  } catch (e) {
    next(e);
  }
});

router.post('/redemption.webhook/square', asyncHandler(handleSquareWebhook));

router.post('/admin.outreach.connectOutlook', requireRole('admin'), asyncHandler(handleOutlookConnect));
router.post('/admin.outreach.send', requireRole('admin'), asyncHandler(handleOutreachSend));
router.post('/admin.outreach.webhook', requireRole('admin'), asyncHandler(handleOutreachWebhook)); 