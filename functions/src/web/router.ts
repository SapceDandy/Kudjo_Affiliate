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
import { handleCampaignJoin } from '../apis/campaign.join';
import { handleRedemptionValidate } from '../apis/redemption.validate';
import { handleRedemptionProcess } from '../apis/redemption.process';
import { handlePayoutRequest } from '../apis/payout.request';
import { handlePayoutLedger } from '../apis/payout.ledger';
import { handleAdminPayoutProcess } from '../apis/payout.process';
import admin from 'firebase-admin';
import { handleSessionLogin } from '../apis/session.login';
import { handleSessionLogout } from '../apis/session.logout';
import { handleSessionMe } from '../apis/session.me';
import { handleControlCenterSession } from '../apis/control-center.session';
import { handleControlCenterLogout } from '../apis/control-center.logout';
import { handleControlCenterLogin } from '../apis/control-center.login';
import { handleControlCenterMetrics } from '../apis/control-center.metrics';
import { handleControlCenterStatsSummary } from '../apis/control-center.stats.summary';
import { handleControlCenterStatsFunnel } from '../apis/control-center.stats.funnel';
import { handleControlCenterStatsRedemptions } from '../apis/control-center.stats.redemptions';
import { handleControlCenterStatsPayouts } from '../apis/control-center.stats.payouts';
import { handleControlCenterExportRedemptionsCsv } from '../apis/control-center.export.redemptions.csv';
import { handleControlCenterExportPayoutsCsv } from '../apis/control-center.export.payouts.csv';
import { handleControlCenterExport } from '../apis/control-center.export';
import { handleAnalyticsRoas } from '../apis/analytics.roas';
import { handleAnalyticsTierMix } from '../apis/analytics.tier-mix';
import { handleAnalyticsTopBusinesses } from '../apis/analytics.top-businesses';
import { handleAnalyticsEarningsOverTime } from '../apis/analytics.earnings-over-time';
import { handleAnalyticsOffer } from '../apis/analytics.offer';
import { handleControlCenterUsersList } from '../apis/control-center.users.list';
import { handleControlCenterUsersUpdate } from '../apis/control-center.users.update';
import { handleControlCenterUsersSeed } from '../apis/control-center.users.seed';
import { handleControlCenterUsersCreate } from '../apis/control-center.users.create';
import { handleBusinessRecommendations } from '../apis/business.recommendations';
import { handleInfluencerRecommendations } from '../apis/influencer.recommendations';

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

type HttpMethod = 'get' | 'post';
type Role = 'public' | 'influencer' | 'business' | 'admin';

type RouteDef = {
  method: HttpMethod;
  canonical: string;
  aliases?: string[];
  role: Role;
  handler: (req: any, res: any) => any;
};

const DEPRECATION_SUNSET = '2026-04-01';

function withDeprecationHeaders(handler: RouteDef['handler'], successorPath: string): RouteDef['handler'] {
  return async (req: any, res: any) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', DEPRECATION_SUNSET);
    res.set('Link', `<${req.baseUrl}${successorPath}>; rel="successor-version"`);
    return handler(req, res);
  };
}

function authWrap(role: Role, handler: RouteDef['handler']) {
  if (role === 'public') {
    return [asyncHandler(handler)];
  }
  return [requireRole(role as any), asyncHandler(handler)];
}

function mount(app: typeof router, r: RouteDef) {
  (app as any)[r.method](r.canonical, ...authWrap(r.role, r.handler));
  (r.aliases ?? []).forEach((alias) => {
    (app as any)[r.method](alias, ...authWrap(r.role, withDeprecationHeaders(r.handler, r.canonical)));
  });
}

const routes: RouteDef[] = [
  {
    method: 'post',
    canonical: '/session/login',
    role: 'public',
    handler: handleSessionLogin,
  },
  {
    method: 'post',
    canonical: '/session/logout',
    role: 'public',
    handler: handleSessionLogout,
  },
  {
    method: 'get',
    canonical: '/session/me',
    role: 'public',
    handler: handleSessionMe,
  },
  {
    method: 'get',
    canonical: '/control-center/session',
    role: 'admin',
    handler: handleControlCenterSession,
  },
  {
    method: 'post',
    canonical: '/control-center/login',
    role: 'public',
    handler: handleControlCenterLogin,
  },
  {
    method: 'post',
    canonical: '/control-center/logout',
    role: 'public',
    handler: handleControlCenterLogout,
  },
  {
    method: 'get',
    canonical: '/control-center/metrics',
    role: 'admin',
    handler: handleControlCenterMetrics,
  },
  {
    method: 'get',
    canonical: '/control-center/stats/summary',
    role: 'admin',
    handler: handleControlCenterStatsSummary,
  },
  {
    method: 'get',
    canonical: '/control-center/stats/funnel',
    role: 'admin',
    handler: handleControlCenterStatsFunnel,
  },
  {
    method: 'get',
    canonical: '/control-center/stats/redemptions',
    role: 'admin',
    handler: handleControlCenterStatsRedemptions,
  },
  {
    method: 'get',
    canonical: '/control-center/stats/payouts',
    role: 'admin',
    handler: handleControlCenterStatsPayouts,
  },
  {
    method: 'get',
    canonical: '/control-center/export/redemptions.csv',
    role: 'admin',
    handler: handleControlCenterExportRedemptionsCsv,
  },
  {
    method: 'get',
    canonical: '/control-center/export/payouts.csv',
    role: 'admin',
    handler: handleControlCenterExportPayoutsCsv,
  },
  {
    method: 'post',
    canonical: '/control-center/export',
    role: 'admin',
    handler: handleControlCenterExport,
  },
  {
    method: 'get',
    canonical: '/analytics/roas',
    role: 'public',
    handler: handleAnalyticsRoas,
  },
  {
    method: 'get',
    canonical: '/analytics/tier-mix',
    role: 'public',
    handler: handleAnalyticsTierMix,
  },
  {
    method: 'get',
    canonical: '/analytics/top-businesses',
    role: 'public',
    handler: handleAnalyticsTopBusinesses,
  },
  {
    method: 'get',
    canonical: '/analytics/earnings-over-time',
    role: 'public',
    handler: handleAnalyticsEarningsOverTime,
  },
  {
    method: 'get',
    canonical: '/analytics/offer',
    role: 'public',
    handler: handleAnalyticsOffer,
  },
  {
    method: 'get',
    canonical: '/control-center/users',
    role: 'admin',
    handler: handleControlCenterUsersList,
  },
  {
    method: 'post',
    canonical: '/control-center/users/update',
    role: 'admin',
    handler: handleControlCenterUsersUpdate,
  },
  {
    method: 'post',
    canonical: '/control-center/users/seed',
    role: 'admin',
    handler: handleControlCenterUsersSeed,
  },
  {
    method: 'post',
    canonical: '/control-center/users/create',
    role: 'admin',
    handler: handleControlCenterUsersCreate,
  },
  {
    method: 'get',
    canonical: '/business/recommendations',
    role: 'business',
    handler: handleBusinessRecommendations,
  },
  {
    method: 'get',
    canonical: '/influencer/recommendations',
    role: 'influencer',
    handler: handleInfluencerRecommendations,
  },
  {
    method: 'post',
    canonical: '/influencer/join-campaign',
    aliases: ['/influencer.join-campaign'],
    role: 'influencer',
    handler: handleCampaignJoin,
  },
  {
    method: 'post',
    canonical: '/redemptions/validate',
    aliases: ['/redemptions.validate'],
    role: 'business',
    handler: handleRedemptionValidate,
  },
  {
    method: 'post',
    canonical: '/redemptions/process',
    aliases: ['/redemptions.process'],
    role: 'business',
    handler: handleRedemptionProcess,
  },
  {
    method: 'post',
    canonical: '/payouts/request',
    aliases: ['/payouts.request'],
    role: 'influencer',
    handler: handlePayoutRequest,
  },
  {
    method: 'get',
    canonical: '/payouts/ledger',
    aliases: ['/payouts.ledger'],
    role: 'influencer',
    handler: handlePayoutLedger,
  },
  {
    method: 'get',
    canonical: '/ledger/history',
    aliases: ['/ledger.history'],
    role: 'influencer',
    handler: handlePayoutLedger,
  },
  {
    method: 'post',
    canonical: '/admin/payouts/process',
    aliases: ['/admin.payouts.process'],
    role: 'admin',
    handler: handleAdminPayoutProcess,
  },
];

routes.forEach((r) => mount(router, r));

router.post('/business.create', requireRole('business'), asyncHandler(handleBusinessCreate, ApiBusinessCreate));
router.post('/business.pos.connect', requireRole('business'), asyncHandler(handleBusinessPosConnect, ApiBusinessPosConnect));
router.post('/offer.create', requireRole('business'), asyncHandler(handleOfferCreate));
router.post('/coupon.claim', requireRole('influencer'), asyncHandler(handleCouponClaim));
router.post('/link.create', requireRole('influencer'), asyncHandler(handleLinkCreate));
router.post('/post.submit', requireRole('influencer'), asyncHandler(handlePostSubmit));
router.get('/earnings.summary', requireRole('influencer'), asyncHandler(handleEarningsSummary));
router.get('/payout.summary', requireRole('influencer'), asyncHandler(handlePayoutSummary));
router.get('/influencer.oauth.start', asyncHandler(handleInfluencerOAuthStart));
router.get('/offer.suggest', requireRole('business'), asyncHandler(async (req, res) => {
  await handleOfferSuggest(req, res);
}));

router.post('/redemption.webhook/square', asyncHandler(handleSquareWebhook));

router.post('/admin.outreach.connectOutlook', requireRole('admin'), asyncHandler(handleOutlookConnect));
router.post('/admin.outreach.send', requireRole('admin'), asyncHandler(handleOutreachSend));
router.post('/admin.outreach.webhook', requireRole('admin'), asyncHandler(handleOutreachWebhook)); 