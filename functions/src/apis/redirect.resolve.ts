import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { sha256Hex } from '../utils/shared';

function isValidToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{4,128}$/.test(token);
}

function hashOrEmpty(value: string | undefined): string {
  if (!value) return '';
  return sha256Hex(value);
}

function getClientIp(req: Request): string {
  const xfwd = (req.headers['x-forwarded-for'] as string | undefined) || '';
  const first = xfwd.split(',')[0]?.trim();
  return first || req.ip || '';
}

export async function handleRedirectResolve(req: Request, res: Response): Promise<void> {
  const token = String((req.params as any).token || '');
  if (!isValidToken(token)) {
    res.status(404).send('Not found');
    return;
  }

  const db = admin.firestore();
  const linkSnap = await db.collection('affiliateLinks').doc(token).get();

  if (!linkSnap.exists) {
    res.status(404).send('Not found');
    return;
  }

  const link = linkSnap.data() as any;

  if (link?.status && link.status !== 'active') {
    res.status(410).send('Gone');
    return;
  }

  const destinationUrl = String(link?.destinationUrl || '');
  let parsed: URL;
  try {
    parsed = new URL(destinationUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
  } catch {
    res.status(404).send('Not found');
    return;
  }

  const ua = String(req.headers['user-agent'] || '');
  const referrer = String(req.headers['referer'] || req.headers['referrer'] || '');
  const ip = getClientIp(req);

  const payload = {
    token,
    kind: link?.kind || null,
    campaignId: link?.campaignId || null,
    businessId: link?.businessId || null,
    influencerId: link?.influencerId || null,
    utmSource: (req.query as any)?.utm_source || null,
    utmMedium: (req.query as any)?.utm_medium || null,
    utmCampaign: (req.query as any)?.utm_campaign || null,
    requestId: (req as any).requestId || null,
    ipHash: hashOrEmpty(ip),
    uaHash: hashOrEmpty(ua),
    referrerHash: hashOrEmpty(referrer),
  };

  await db.collection('events').add({
    event: 'affiliate_click',
    token,
    payload,
    timestamp: new Date().toISOString(),
  });

  res.cookie('kudjo_ref', token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.redirect(302, destinationUrl);
}
