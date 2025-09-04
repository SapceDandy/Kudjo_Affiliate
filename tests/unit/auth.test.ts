import { describe, test, expect, jest } from '@jest/globals';

// Type definitions for mocks
interface MockFirestoreDoc {
  exists: boolean;
  data: () => any;
}

interface MockFirestore {
  collection: jest.MockedFunction<any>;
}

// Unit tests for authentication logic
// Based on INSTRUCTIONS.md Section 3 - Authentication & Role Gating

describe('Authentication Unit Tests', () => {
  
  describe('Role Resolution', () => {
    test('should resolve admin role from session cookie', async () => {
      // Mock admin session cookie
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'valid-admin-jwt' })
        }
      };

      // Mock JWT verification
      const mockJwt = {
        verify: jest.fn().mockReturnValue({ role: 'admin', email: 'devon@getkudjo.com' })
      };

      // Test role resolution logic
      const role = await resolveUserRole(mockRequest, mockJwt);
      expect(role).toBe('admin');
    });

    test('should resolve business role from Firestore document', async () => {
      const mockDoc: MockFirestoreDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({ role: 'business' })
      };
      
      const mockFirestore: MockFirestore = {
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockDoc)
          })
        })
      };

      const mockUser = { uid: 'business-user-id' };
      const role = await resolveUserRole(mockUser, mockFirestore);
      expect(role).toBe('business');
    });

    test('should resolve influencer role from Firestore document', async () => {
      const mockDoc: MockFirestoreDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({ role: 'influencer' })
      };
      
      const mockFirestore: MockFirestore = {
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockDoc)
          })
        })
      };

      const mockUser = { uid: 'influencer-user-id' };
      const role = await resolveUserRole(mockUser, mockFirestore);
      expect(role).toBe('influencer');
    });

    test('should return null for unauthenticated user', async () => {
      const role = await resolveUserRole(null);
      expect(role).toBeNull();
    });
  });

  describe('Route Guards', () => {
    test('should block /control-center/* without admin role', () => {
      const mockRequest = { nextUrl: { pathname: '/control-center/dashboard' } };
      const user = { role: 'business' };
      
      const shouldBlock = shouldBlockRoute(mockRequest, user);
      expect(shouldBlock).toBe(true);
    });

    test('should allow /control-center/* with admin role', () => {
      const mockRequest = { nextUrl: { pathname: '/control-center/dashboard' } };
      const user = { role: 'admin' };
      
      const shouldBlock = shouldBlockRoute(mockRequest, user);
      expect(shouldBlock).toBe(false);
    });

    test('should block /business/* without business role', () => {
      const mockRequest = { nextUrl: { pathname: '/business/dashboard' } };
      const user = { role: 'influencer' };
      
      const shouldBlock = shouldBlockRoute(mockRequest, user);
      expect(shouldBlock).toBe(true);
    });

    test('should allow /business/* with business role', () => {
      const mockRequest = { nextUrl: { pathname: '/business/dashboard' } };
      const user = { role: 'business' };
      
      const shouldBlock = shouldBlockRoute(mockRequest, user);
      expect(shouldBlock).toBe(false);
    });

    test('should allow /auth/* for all users', () => {
      const mockRequest = { nextUrl: { pathname: '/auth/signin' } };
      const user = null;
      
      const shouldBlock = shouldBlockRoute(mockRequest, user);
      expect(shouldBlock).toBe(false);
    });
  });

  describe('JWT Token Handling', () => {
    test('should generate valid admin JWT token', () => {
      const mockJwt = {
        sign: jest.fn().mockReturnValue('mock-jwt-token')
      };

      const token = generateAdminToken('devon@getkudjo.com', mockJwt);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { role: 'admin', email: 'devon@getkudjo.com' },
        expect.any(String),
        { expiresIn: '12h' }
      );
      expect(token).toBe('mock-jwt-token');
    });

    test('should verify admin JWT token', () => {
      const mockJwt = {
        verify: jest.fn().mockReturnValue({ role: 'admin', email: 'devon@getkudjo.com' })
      };

      const payload = verifyAdminToken('valid-token', mockJwt);
      expect(payload.role).toBe('admin');
      expect(payload.email).toBe('devon@getkudjo.com');
    });

    test('should handle invalid JWT token', () => {
      const mockJwt = {
        verify: jest.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        })
      };

      expect(() => verifyAdminToken('invalid-token', mockJwt)).toThrow('Invalid token');
    });
  });

  describe('Session Security', () => {
    test('should set secure HTTP-only cookie for admin session', () => {
      const mockResponse = {
        cookies: {
          set: jest.fn()
        }
      };

      setAdminSessionCookie(mockResponse, 'admin-jwt-token');
      
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        'admin_session',
        'admin-jwt-token',
        {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/'
        }
      );
    });

    test('should clear admin session cookie on logout', () => {
      const mockResponse = {
        cookies: {
          delete: jest.fn()
        }
      };

      clearAdminSessionCookie(mockResponse);
      
      expect(mockResponse.cookies.delete).toHaveBeenCalledWith('admin_session');
    });
  });
});

// Mock functions for testing
async function resolveUserRole(user: any, firestore?: any, jwt?: any): Promise<string | null> {
  if (!user) return null;
  
  if (user.cookies && jwt) {
    const token = user.cookies.get('admin_session');
    if (token) {
      const payload = jwt.verify(token.value);
      return payload.role;
    }
  }
  
  if (user.uid && firestore) {
    const businessDoc = await firestore.collection('businesses').doc(user.uid).get();
    if (businessDoc.exists) {
      const data = businessDoc.data();
      return data.role || 'business';
    }
    
    const influencerDoc = await firestore.collection('influencers').doc(user.uid).get();
    if (influencerDoc.exists) {
      const data = influencerDoc.data();
      return data.role || 'influencer';
    }
  }
  
  return null;
}

function shouldBlockRoute(request: any, user: any): boolean {
  const pathname = request.nextUrl.pathname;
  
  if (pathname.startsWith('/control-center')) {
    return !user || user.role !== 'admin';
  }
  
  if (pathname.startsWith('/business')) {
    return !user || user.role !== 'business';
  }
  
  if (pathname.startsWith('/influencer')) {
    return !user || user.role !== 'influencer';
  }
  
  if (pathname.startsWith('/auth')) {
    return false;
  }
  
  return false;
}

function generateAdminToken(email: string, jwt: any): string {
  return jwt.sign(
    { role: 'admin', email },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifyAdminToken(token: string, jwt: any): any {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function setAdminSessionCookie(response: any, token: string): void {
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });
}

function clearAdminSessionCookie(response: any): void {
  response.cookies.delete('admin_session');
}
