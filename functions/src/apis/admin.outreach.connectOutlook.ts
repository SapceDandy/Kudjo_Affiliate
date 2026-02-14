import { Request, Response } from 'express';
import admin from 'firebase-admin';

export async function handleOutlookConnect(req: Request, res: Response) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${req.protocol}://${req.get('host')}/admin/outreach/oauth/callback`;

  if (!clientId) {
    res.status(500).json({ error: 'MICROSOFT_CLIENT_ID not configured' });
    return;
  }

  const scopes = [
    'Mail.Send',
    'offline_access',
    'User.Read',
  ].join(' ');

  const state = require('crypto').randomBytes(16).toString('hex');

  // Store state in Firestore for CSRF validation
  await admin.firestore().doc(`admin/outreachOAuth/${state}`).set({
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    userId: (req as any).user?.uid || 'unknown',
  });

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_mode', 'query');

  res.json({ authUrl: authUrl.toString() });
}
