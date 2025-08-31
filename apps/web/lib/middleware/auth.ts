import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

export type UserRole = 'admin' | 'business' | 'influencer';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: UserRole;
  businessId?: string;
  influencerId?: string;
}

/**
 * Authentication middleware that verifies Firebase Auth tokens
 * and extracts user role information
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '');

    // Fallback to query parameter for development/demo
    if (!token) {
      const url = new URL(request.url);
      token = url.searchParams.get('token') || undefined;
    }

    // For demo mode, check for demo user IDs
    if (!token) {
      const url = new URL(request.url);
      const demoUserId = url.searchParams.get('infId') || url.searchParams.get('bizId') || url.searchParams.get('userId');
      
      if (demoUserId) {
        // Return demo user based on ID pattern
        if (demoUserId.includes('business')) {
          return {
            uid: demoUserId,
            email: 'demo.business@example.com',
            role: 'business',
            businessId: demoUserId
          };
        } else if (demoUserId.includes('influencer')) {
          return {
            uid: demoUserId,
            email: 'demo.influencer@example.com',
            role: 'influencer',
            influencerId: demoUserId
          };
        } else if (demoUserId.includes('admin')) {
          return {
            uid: demoUserId,
            email: 'demo.admin@example.com',
            role: 'admin'
          };
        }
      }
    }

    if (!token) {
      return null;
    }

    // Verify the Firebase Auth token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const { uid, email } = decodedToken;

    if (!adminDb) {
      throw new Error('Database not available');
    }

    // Get user role from Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get();
    let role: UserRole = 'influencer'; // default
    let businessId: string | undefined;
    let influencerId: string | undefined;

    if (userDoc.exists) {
      const userData = userDoc.data();
      role = userData?.role || 'influencer';
    } else {
      // Try to determine role from other collections
      const businessDoc = await adminDb.collection('businesses').doc(uid).get();
      const influencerDoc = await adminDb.collection('influencers').doc(uid).get();
      
      if (businessDoc.exists) {
        role = 'business';
        businessId = uid;
      } else if (influencerDoc.exists) {
        role = 'influencer';
        influencerId = uid;
      }
    }

    // Set business/influencer IDs based on role
    if (role === 'business') {
      businessId = businessId || uid;
    } else if (role === 'influencer') {
      influencerId = influencerId || uid;
    }

    return {
      uid,
      email: email || '',
      role,
      businessId,
      influencerId
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Middleware factory that requires specific roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> => {
    const user = await authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', requiredRoles: allowedRoles, userRole: user.role },
        { status: 403 }
      );
    }

    return { user };
  };
}

/**
 * Middleware that requires business ownership
 */
export async function requireBusinessOwnership(request: NextRequest, businessId: string): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const authResult = await requireRole('business', 'admin')(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Admin can access any business
  if (user.role === 'admin') {
    return { user };
  }

  // Business owner can only access their own business
  if (user.role === 'business' && user.businessId === businessId) {
    return { user };
  }

  return NextResponse.json(
    { error: 'Access denied: not business owner' },
    { status: 403 }
  );
}

/**
 * Middleware that requires influencer ownership
 */
export async function requireInfluencerOwnership(request: NextRequest, influencerId: string): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const authResult = await requireRole('influencer', 'admin')(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Admin can access any influencer
  if (user.role === 'admin') {
    return { user };
  }

  // Influencer can only access their own data
  if (user.role === 'influencer' && user.influencerId === influencerId) {
    return { user };
  }

  return NextResponse.json(
    { error: 'Access denied: not influencer owner' },
    { status: 403 }
  );
}

/**
 * Validation schemas for common request types
 */
export const authSchemas = {
  businessId: z.string().min(1, 'Business ID required'),
  influencerId: z.string().min(1, 'Influencer ID required'),
  offerId: z.string().min(1, 'Offer ID required'),
  couponId: z.string().min(1, 'Coupon ID required')
};
