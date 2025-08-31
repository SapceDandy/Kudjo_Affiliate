import { NextRequest } from 'next/server';

export interface ServerUser {
  uid: string;
  email?: string;
  role?: 'admin' | 'business' | 'influencer';
}

export async function getCurrentUser(request?: NextRequest): Promise<ServerUser | null> {
  try {
    // Check for user ID in headers (passed from frontend)
    const userId = request?.headers.get('x-user-id');
    const userRole = request?.headers.get('x-user-role') as 'admin' | 'business' | 'influencer' | undefined;
    const userEmail = request?.headers.get('x-user-email');
    
    if (userId) {
      return {
        uid: userId,
        email: userEmail || undefined,
        role: userRole || 'business'
      };
    }
    
    // Fallback to mock for development
    if (process.env.NODE_ENV === 'development') {
      return {
        uid: 'mock-user-id',
        email: 'user@example.com',
        role: 'business'
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
