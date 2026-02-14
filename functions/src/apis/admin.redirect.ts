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

export async function handleAdminRedirect(req: Request, res: Response): Promise<void> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.__session;

  if (!sessionCookie) {
    res.redirect(302, '/control-center/login');
    return;
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    const role = roleFromClaims(decoded as any);

    if (role !== 'admin') {
      res.redirect(302, '/auth/signin');
      return;
    }

    res.redirect(302, '/control-center');
  } catch (e) {
    res.cookie('__session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    res.redirect(302, '/control-center/login');
  }
}
