import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';
import QRCode from 'qrcode';
import { generateShortCode } from '../utils/shared';

const schema = z.object({
  offerId: z.string().min(1),
  infId: z.string().min(1).optional(),
  legalAccepted: z.boolean(),
});

function couponCode(prefix: 'AF' | 'CM') {
  return `${prefix}-${generateShortCode(8)}`;
}

export async function handleCampaignJoin(req: Request, res: Response): Promise<void> {
  const body = schema.parse(req.body);
  const user = (req as any).user as { uid: string; role: string } | undefined;

  const infId = body.infId || user?.uid;
  if (!infId) {
    res.status(400).json({ error: 'validation_error' });
    return;
  }

  if (user?.role === 'influencer' && user.uid !== infId) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  if (!body.legalAccepted) {
    res.status(400).json({ error: 'validation_error', message: 'Legal terms must be accepted' });
    return;
  }

  const db = admin.firestore();
  const offerId = body.offerId;

  const joinId = `${offerId}_${infId}`;
  const joinRef = db.collection('campaignJoins').doc(joinId);

  const existingJoin = await joinRef.get();
  if (existingJoin.exists) {
    const data = existingJoin.data() as any;
    res.json({
      success: true,
      coupons: data.coupons,
      deadlines: data.deadlines,
    });
    return;
  }

  const offerDoc = await db.collection('offers').doc(offerId).get();
  if (!offerDoc.exists) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const offer = offerDoc.data() as any;
  const isActive = Boolean(offer.active ?? (offer.status ? offer.status === 'active' : true));
  if (!isActive) {
    res.status(400).json({ error: 'invalid_state', message: 'Offer is not active' });
    return;
  }

  const influencerDoc = await db.collection('influencers').doc(infId).get();
  if (!influencerDoc.exists) {
    res.status(404).json({ error: 'not_found', message: 'Influencer not found' });
    return;
  }

  const influencer = influencerDoc.data() as any;
  const tier = influencer.tier || 'S';

  const tierAllowlist: string[] | undefined = offer?.eligibility?.tiers || offer?.eligibleTiers;
  if (tierAllowlist && Array.isArray(tierAllowlist) && !tierAllowlist.includes(tier)) {
    res.status(403).json({ error: 'forbidden', message: 'Not eligible for this offer' });
    return;
  }

  if (offer.maxInfluencers) {
    const activeAffCoupons = await db
      .collection('coupons')
      .where('offerId', '==', offerId)
      .where('type', '==', 'AFFILIATE')
      .where('status', '==', 'active')
      .get();

    if (activeAffCoupons.size >= Number(offer.maxInfluencers)) {
      res.status(400).json({ error: 'campaign_full' });
      return;
    }
  }

  const cooldownDays = Number(offer.cooldownDays || 7);
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

  const recentCoupons = await db
    .collection('coupons')
    .where('infId', '==', infId)
    .where('bizId', '==', offer.bizId)
    .where('createdAt', '>', cooldownDate)
    .get();

  if (recentCoupons.size > 0) {
    res
      .status(400)
      .json({ error: 'cooldown', message: `Must wait ${cooldownDays} days between campaigns from this business` });
    return;
  }

  const now = new Date();
  const deadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const affiliateCode = couponCode('AF');
  const contentCode = couponCode('CM');

  const token = generateShortCode(12);
  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
  const shortUrl = `${baseUrl}/r/${token}`;
  const destinationUrl = `${baseUrl}/offer/${offerId}?i=${encodeURIComponent(infId)}`;

  const affiliateQR = await QRCode.toDataURL(shortUrl);
  const contentQR = await QRCode.toDataURL(contentCode);

  const affiliateCouponRef = db.collection('coupons').doc();
  const contentCouponRef = db.collection('coupons').doc();
  const affiliateLinkRef = db.collection('affiliateLinks').doc(token);

  const batch = db.batch();

  batch.set(affiliateCouponRef, {
    type: 'AFFILIATE',
    bizId: offer.bizId,
    infId,
    offerId,
    linkId: token,
    code: affiliateCode,
    status: 'active',
    discountType: offer.discountType || 'percentage',
    discountValue: offer.discountValue || offer.splitPct || 0,
    maxDiscountCents: offer.maxDiscountCents || null,
    splitPct: offer.splitPct || 20,
    usageCount: 0,
    maxUses: offer.maxUsesPerInfluencer || offer.maxUses || 100,
    deadlineAt: deadlineDate,
    admin: { posAdded: false },
    createdAt: now,
    updatedAt: now,
    termsAcceptedAt: now,
  });

  batch.set(contentCouponRef, {
    type: 'CONTENT_MEAL',
    bizId: offer.bizId,
    infId,
    offerId,
    code: contentCode,
    status: 'active',
    discountType: offer.discountType || 'percentage',
    discountValue: offer.discountValue || 0,
    maxDiscountCents: offer.maxDiscountCents || null,
    splitPct: 0,
    usageCount: 0,
    maxUses: 1,
    deadlineAt: deadlineDate,
    admin: { posAdded: false },
    createdAt: now,
    updatedAt: now,
    termsAcceptedAt: now,
  });

  batch.set(affiliateLinkRef, {
    token,
    kind: 'campaign',
    campaignId: offerId,
    businessId: offer.bizId,
    influencerId: infId,
    destinationUrl,
    createdAt: now,
    status: 'active',
    metadata: {
      couponId: affiliateCouponRef.id,
    },
  });

  batch.set(joinRef, {
    offerId,
    bizId: offer.bizId,
    infId,
    joinedAt: now,
    coupons: {
      affiliate: {
        id: affiliateCouponRef.id,
        code: affiliateCode,
        qrUrl: affiliateQR,
        linkId: token,
        linkUrl: shortUrl,
      },
      contentMeal: {
        id: contentCouponRef.id,
        code: contentCode,
        qrUrl: contentQR,
      },
    },
    deadlines: {
      postWithin: '7 days',
      keepPosted: '7-14 days',
    },
  });

  await batch.commit();

  res.json({
    success: true,
    coupons: {
      affiliate: {
        id: affiliateCouponRef.id,
        code: affiliateCode,
        qrUrl: affiliateQR,
        linkId: token,
        linkUrl: shortUrl,
      },
      contentMeal: {
        id: contentCouponRef.id,
        code: contentCode,
        qrUrl: contentQR,
      },
    },
    deadlines: {
      postWithin: '7 days',
      keepPosted: '7-14 days',
    },
  });
}
