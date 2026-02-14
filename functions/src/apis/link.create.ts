import { Request, Response } from 'express';
import admin from 'firebase-admin';
import QRCode from 'qrcode';
import { generateShortCode, nowIso } from '../utils/shared';

export async function handleLinkCreate(req: Request, res: Response): Promise<void> {
  const { offerId, infId, utmSource = 'affiliate', utmMedium = 'influencer', utmCampaign = '' } = req.body as any;
  const shortCode = generateShortCode(7);
  const baseUrl = process.env.PUBLIC_URL || 'https://example.com';
  const shortUrl = `${baseUrl}/r/${shortCode}`;
  const destinationUrl = `${baseUrl}/offer/${encodeURIComponent(offerId)}?i=${encodeURIComponent(infId)}&utm_source=${encodeURIComponent(
    utmSource
  )}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaign)}`;
  const qrUrl = await QRCode.toDataURL(shortUrl);

  const offerSnap = await admin.firestore().doc(`offers/${offerId}`).get();
  const businessId = String(offerSnap.get('bizId') || '');

  await admin.firestore().collection('affiliateLinks').doc(shortCode).set({
    token: shortCode,
    kind: 'campaign',
    campaignId: offerId,
    businessId,
    influencerId: infId,
    destinationUrl,
    createdAt: nowIso(),
    status: 'active',
    metadata: {
      utmSource,
      utmMedium,
      utmCampaign,
    },
  });

  res.json({ shortUrl, qrUrl, token: shortCode });
}
 