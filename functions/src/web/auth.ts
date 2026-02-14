import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { randomUUID } from 'crypto';

let initialized = false;
function ensureInit() {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
  }
}

type UserRole = 'public' | 'influencer' | 'business' | 'admin';

function getRequestId(req: Request): string {
  const existing = (req.headers['x-request-id'] || req.headers['x-correlation-id']) as string | undefined;
  if (existing && typeof existing === 'string') return existing;
  return randomUUID();
}

function isPublicRoute(req: Request): boolean {
  const path = req.path || '';
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') return true;

  if (method === 'GET' && path === '/api/influencer.oauth.start') return true;
  if (method === 'POST' && path === '/api/redemption.webhook/square') return true;

  if (method === 'GET' && path.startsWith('/api/a/')) return true;
  if (method === 'GET' && path.startsWith('/api/r/')) return true;

  if (method === 'GET' && path.startsWith('/a/')) return true;
  if (method === 'GET' && path.startsWith('/r/')) return true;

  if (method === 'GET' && path === '/') return true;
  if (path.startsWith('/api/session/')) return true;
  if (path === '/api/control-center/login') return true;
  if (path === '/api/control-center/logout') return true;
  if (path.startsWith('/api/analytics/')) return true;

  return false;
}

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

function parseRoleFromClaims(decoded: admin.auth.DecodedIdToken): UserRole {
  const anyDecoded = decoded as any;
  const role = anyDecoded.role;
  if (role === 'admin' || role === 'business' || role === 'influencer') return role;
  if (anyDecoded.admin === true) return 'admin';
  if (anyDecoded.business === true) return 'business';
  return 'influencer';
}

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  const requestId = getRequestId(req);
  (req as any).requestId = requestId;
  res.set('x-request-id', requestId);

  const isPublic = isPublicRoute(req);

  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);

    if (match) {
      ensureInit();
      const decoded = await admin.auth().verifyIdToken(match[1]);
      const role = parseRoleFromClaims(decoded);
      (req as any).user = { uid: decoded.uid, role };
      next();
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const sessionCookie = cookies.__session;
    if (sessionCookie) {
      ensureInit();
      const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
      const role = parseRoleFromClaims(decoded as any);
      (req as any).user = { uid: decoded.uid, role };
      next();
      return;
    }

    if (isPublic) return next();
    return res.status(401).json({ error: 'unauthenticated' });
  } catch (e) {
    if (isPublic) return next();
    return res.status(401).json({ error: 'unauthenticated' });
  }
}