import { Request, Response } from 'express';
import admin from 'firebase-admin';
import QRCode from 'qrcode';
import { generateShortCode, nowIso } from '../utils/shared';

export async function handleLinkCreate(req: Request, res: Response): Promise<void> {
  const { offerId, infId, utmSource = 'affiliate', utmMedium = 'influencer', utmCampaign = '' } = req.body as any;
  const shortCode = generateShortCode(7);
  const baseUrl = process.env.PUBLIC_URL || 'https://example.com';
  const url = `${baseUrl}/a/${shortCode}?utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaign)}`;
  const qrUrl = await QRCode.toDataURL(url);

  await admin.firestore().collection('shortUrls').doc(shortCode).set({ url, offerId, infId, createdAt: nowIso() });
  const doc = await admin.firestore().collection('affiliateLinks').add({
    bizId: (await admin.firestore().doc(`offers/${offerId}`).get()).get('bizId'),
    infId,
    offerId,
    shortCode,
    token: shortCode,
    url,
    qrUrl,
    utmSource,
    utmMedium,
    utmCampaign,
    status: 'active',
    createdAt: nowIso(),
  });
  res.json({ shortUrl: url, qrUrl, token: shortCode });
} 