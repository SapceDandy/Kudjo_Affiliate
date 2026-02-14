import { NextRequest } from 'next/server';

export interface ServerUser {
  uid: string;
  email?: string;
  role?: 'admin' | 'business' | 'influencer';
}

export async function getCurrentUser(request?: NextRequest): Promise<ServerUser | null> {
  try {
    const NODE_ENV = process.env.NODE_ENV;

    // Try Firebase Admin session cookie / ID token first (works in all envs)
    const sessionCookie = request?.cookies.get('__session')?.value;
    const authHeader = request?.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (sessionCookie || idToken) {
      try {
        const { getAuth } = await import('firebase-admin/auth');
        const { initializeFirebaseAdmin } = await import('@/lib/firebase-admin');
        await initializeFirebaseAdmin();
        const adminAuth = getAuth();

        let decodedToken;
        if (sessionCookie) {
          decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        } else if (idToken) {
          decodedToken = await adminAuth.verifyIdToken(idToken);
        }

        if (decodedToken) {
          return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: (decodedToken.role as ServerUser['role']) || 'influencer',
          };
        }
      } catch (err) {
        // Token verification failed — fall through to dev helpers
        if (NODE_ENV !== 'development') {
          console.error('Firebase token verification failed:', err);
          return null;
        }
      }
    }

    // Development mode fallback - return mock influencer user
    if (NODE_ENV === 'development') {
      // Check for user ID in headers (passed from frontend)
      const userId = request?.headers.get('x-user-id');
      const userRole = request?.headers.get('x-user-role') as 'admin' | 'business' | 'influencer' | undefined;
      const userEmail = request?.headers.get('x-user-email');

      if (userId && userId !== 'mock-user-id') {
        return {
          uid: userId,
          email: userEmail || undefined,
          role: userRole || 'influencer'
        };
      }

      // Check for user ID in query parameters as fallback
      const url = new URL(request?.url || '');
      const queryUserId = url.searchParams.get('uid') || url.searchParams.get('userId');
      const queryUserRole = url.searchParams.get('userRole') as 'admin' | 'business' | 'influencer' | undefined;
      const queryUserEmail = url.searchParams.get('userEmail');

      if (queryUserId && queryUserId !== 'mock-user-id') {
        return {
          uid: queryUserId,
          email: queryUserEmail || undefined,
          role: queryUserRole || 'influencer'
        };
      }

      // Development fallback - return mock influencer user
      return {
        uid: 'testhandleinfluencer2',
        email: 'testhandleinfluencer2@example.com',
        role: 'influencer'
      };
    }

    return null;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function verifyAdminAccess(request: NextRequest): Promise<boolean> {
  const adminPasscode = process.env.ADMIN_PASSCODE;
  const authHeader = request.headers.get('authorization');

  if (!adminPasscode || !authHeader) {
    return false;
  }

  return authHeader === `Bearer ${adminPasscode}`;
}

export async function getAuth(request: NextRequest): Promise<{ user: ServerUser | null }> {
  // Check for admin_token cookie (works in ALL environments)
  const adminToken = request.cookies.get('admin_token')?.value;
  if (adminToken) {
    try {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('JWT_SECRET not configured');
        return { user: null };
      }
      const decoded = jwt.verify(adminToken, secret) as any;

      if (decoded.isAdmin) {
        return {
          user: {
            uid: 'admin-user',
            email: decoded.email,
            role: 'admin'
          }
        };
      }
    } catch (error) {
      console.error('Admin token verification failed:', error);
    }
  }

  // Check for development bypass header (dev only)
  if (process.env.NODE_ENV === 'development') {
    const bypassHeader = request.headers.get('x-admin-bypass');
    if (bypassHeader === 'true') {
      return {
        user: {
          uid: 'admin-dev-user',
          email: 'admin@dev.local',
          role: 'admin'
        }
      };
    }
  }

  const user = await getCurrentUser(request);
  return { user };
}
