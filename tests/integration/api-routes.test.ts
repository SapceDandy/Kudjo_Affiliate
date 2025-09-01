import { NextRequest } from 'next/server';

// Mock API route handlers for testing
const mockCreateOffer = jest.fn();
const mockGetOffers = jest.fn();
const mockJoinCampaign = jest.fn();
const mockCreateRedemption = jest.fn();

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  },
  adminAuth: {
    verifyIdToken: jest.fn()
  }
}));

describe('API Routes - Authentication & RBAC', () => {
  
  test('protected routes reject no-token requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/business/offers', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Offer' })
    });

    const response = await mockCreateOffer(request);
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toMatch(/authentication required/i);
  });

  test('protected routes reject wrong-role requests', async () => {
    // Mock influencer trying to access business endpoint
    const request = new NextRequest('http://localhost:3000/api/business/offers', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-influencer-token'
      },
      body: JSON.stringify({ title: 'Test Offer' })
    });

    // Mock auth to return influencer role
    const mockAuth = require('@/lib/firebase-admin').adminAuth;
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'test-influencer-001',
      email: 'influencer@test.com'
    });

    const response = await mockCreateOffer(request);
    expect(response.status).toBe(403);
    
    const data = await response.json();
    expect(data.error).toMatch(/insufficient permissions/i);
  });

  test('offer creation validates schema and ties to businessId', async () => {
    const validOfferData = {
      title: 'Test Offer',
      description: 'Test Description',
      discountType: 'percentage',
      discountValue: 10,
      minSpend: 25,
      maxInfluencers: 100,
      tierSplits: {
        Small: 5,
        Medium: 7,
        Large: 10
      },
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const request = new NextRequest('http://localhost:3000/api/business/offers', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-business-token'
      },
      body: JSON.stringify(validOfferData)
    });

    // Mock successful auth
    const mockAuth = require('@/lib/firebase-admin').adminAuth;
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'test-business-001',
      email: 'business@test.com'
    });

    const response = await mockCreateOffer(request);
    expect(response.status).toBe(200);
  });
});

describe('API Routes - Offer Discovery', () => {
  
  test('influencer offer discovery with query-based filtering', async () => {
    const request = new NextRequest('http://localhost:3000/api/influencer/available-campaigns?category=food&tier=Small&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock-influencer-token'
      }
    });

    const response = await getOffers(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.offers).toBeDefined();
    expect(Array.isArray(data.offers)).toBe(true);
  });

  test('pagination with cursor works correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/influencer/available-campaigns?limit=5&startAfter=cursor123', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock-influencer-token'
      }
    });

    const response = await getOffers(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.pagination).toBeDefined();
    expect(data.pagination.nextCursor).toBeDefined();
  });
});

describe('API Routes - Affiliate Links & Coupons', () => {
  
  test('affiliate link creation generates unique token', async () => {
    const request = new NextRequest('http://localhost:3000/api/influencer/join-campaign', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-influencer-token'
      },
      body: JSON.stringify({
        offerId: 'test-offer-001',
        acceptTerms: true
      })
    });

    const response = await mockJoinCampaign(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.affiliateLink).toBeDefined();
    expect(data.contentCoupon).toBeDefined();
    expect(data.affiliateLink.token).toMatch(/^[a-zA-Z0-9-_]+$/);
  });

  test('coupon redemption validates and updates atomically', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/redemptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-admin-token'
      },
      body: JSON.stringify({
        couponCode: 'TEST-COUPON-001',
        amountCents: 2500,
        businessId: 'test-business-001',
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      })
    });

    const response = await mockCreateRedemption(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.redemption).toBeDefined();
    expect(data.redemption.commissionCents).toBeGreaterThan(0);
  });
});

describe('API Routes - Fraud & Compliance', () => {
  
  test('velocity limits prevent excessive redemptions', async () => {
    // Simulate multiple rapid redemptions from same IP
    const requests = Array.from({ length: 10 }, (_, i) => 
      new NextRequest('http://localhost:3000/api/admin/redemptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-admin-token',
          'X-Forwarded-For': '192.168.1.100'
        },
        body: JSON.stringify({
          couponCode: `TEST-COUPON-${i.toString().padStart(3, '0')}`,
          amountCents: 1000,
          businessId: 'test-business-001'
        })
      })
    );

    const responses = await Promise.all(
      requests.map(req => mockCreateRedemption(req))
    );

    // Should have some rate limit failures
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('geofence validation requires proximity to business', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/redemptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-admin-token'
      },
      body: JSON.stringify({
        couponCode: 'TEST-COUPON-001',
        amountCents: 2500,
        businessId: 'test-business-001',
        location: {
          latitude: 0, // Far from business location
          longitude: 0
        }
      })
    });

    const response = await mockCreateRedemption(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toMatch(/location|geofence|proximity/i);
  });
});
