import { Request, Response } from 'express';
import admin from 'firebase-admin';

type UserRole = 'admin' | 'business' | 'influencer';

function parseCookies(header: string | undefined): Record<string, string> {
  const cookieHeader = header || '';
  const out: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) return;
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function roleFromClaims(decoded: any): UserRole | null {
  const role = decoded?.role;
  if (role === 'admin' || role === 'business' || role === 'influencer') return role;
  if (decoded?.admin === true) return 'admin';
  if (decoded?.business === true) return 'business';
  return null;
}

async function resolveRole(uid: string): Promise<UserRole> {
  const db = admin.firestore();

  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    const role = (userDoc.data() as any)?.role;
    if (role === 'admin' || role === 'business' || role === 'influencer') return role;
  }

  const bizDoc = await db.collection('businesses').doc(uid).get();
  if (bizDoc.exists) return 'business';

  const infDoc = await db.collection('influencers').doc(uid).get();
  if (infDoc.exists) return 'influencer';

  return 'influencer';
}

export async function handleSessionMe(req: Request, res: Response): Promise<void> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.__session;

  if (!sessionCookie) {
    res.status(401).json({ ok: false, error: 'unauthenticated' });
    return;
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    const fromClaims = roleFromClaims(decoded as any);
    const role = fromClaims ?? (await resolveRole(decoded.uid));

    res.status(200).json({
      ok: true,
      uid: decoded.uid,
      role,
      claims: {
        role: (decoded as any)?.role,
        admin: (decoded as any)?.admin,
        business: (decoded as any)?.business,
      },
    });
  } catch (e) {
    res.status(401).json({ ok: false, error: 'unauthenticated' });
  }
}
