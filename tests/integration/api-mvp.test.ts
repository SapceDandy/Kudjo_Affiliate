import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Integration tests for MVP API routes
// Based on INSTRUCTIONS.md Section 6 - API Surface

describe('MVP API Integration Tests', () => {
  let adminToken: string;
  let businessToken: string;
  let influencerToken: string;
  let testBusinessId: string;
  let testInfluencerId: string;
  let testOfferId: string;
  let testCouponId: string;

  beforeAll(async () => {
    // Setup test tokens and IDs
    // In real implementation, these would be obtained through proper auth flow
    adminToken = 'test-admin-token';
    businessToken = 'test-business-token';
    influencerToken = 'test-influencer-token';
    testBusinessId = 'test-business-id';
    testInfluencerId = 'test-influencer-id';
  });

  describe('Admin Authentication', () => {
    test('POST /api/control-center/login - valid credentials', async () => {
      const response = await fetch('/api/control-center/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.ADMIN_EMAIL,
          passcode: process.env.ADMIN_PASSCODE
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      
      // Should set admin session cookie
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('admin_session');
    });

    test('POST /api/control-center/login - invalid credentials', async () => {
      const response = await fetch('/api/control-center/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@email.com',
          passcode: 'wrongpasscode'
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Business API Routes', () => {
    test('POST /api/business/register - create business profile', async () => {
      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({
          name: 'Test Restaurant',
          address: '123 Main St, Test City',
          posProvider: 'manual'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.businessId).toBeTruthy();
    });

    test('POST /api/business/offers - create offer', async () => {
      const response = await fetch('/api/business/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({
          title: 'Test Campaign',
          description: 'Test campaign description',
          discountPct: 20,
          freeMealBudget: 25,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          maxActiveInfluencers: 5
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.offerId).toBeTruthy();
      testOfferId = data.offerId;
    });

    test('GET /api/business/metrics - fetch business metrics', async () => {
      const response = await fetch('/api/business/metrics', {
        headers: {
          'Authorization': `Bearer ${businessToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalRedemptions).toBeDefined();
      expect(data.totalRevenue).toBeDefined();
      expect(data.activeOffers).toBeDefined();
    });
  });

  describe('Influencer API Routes', () => {
    test('POST /api/influencer/register - create influencer profile', async () => {
      const response = await fetch('/api/influencer/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${influencerToken}`
        },
        body: JSON.stringify({
          name: 'Test Influencer',
          socialProfiles: {
            instagram: '@testinfluencer',
            tiktok: '@testinfluencer'
          },
          followerCount: 10000
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.influencerId).toBeTruthy();
    });

    test('GET /api/influencer/available-campaigns - fetch available campaigns', async () => {
      const response = await fetch('/api/influencer/available-campaigns', {
        headers: {
          'Authorization': `Bearer ${influencerToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.campaigns)).toBe(true);
    });

    test('POST /api/influencer/join-campaign - join campaign and get codes', async () => {
      const response = await fetch('/api/influencer/join-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${influencerToken}`
        },
        body: JSON.stringify({
          offerId: testOfferId,
          legalAcceptance: true
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.affiliateCode).toBeTruthy();
      expect(data.mealCode).toBeTruthy();
      expect(data.affiliateQR).toBeTruthy();
      expect(data.mealQR).toBeTruthy();
      testCouponId = data.affiliateCode;
    });
  });

  describe('Admin Management Routes', () => {
    test('GET /api/admin/influencers/review-queue - fetch pending influencers', async () => {
      const response = await fetch('/api/admin/influencers/review-queue', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.influencers)).toBe(true);
    });

    test('POST /api/admin/influencers/approve - approve influencer', async () => {
      const response = await fetch('/api/admin/influencers/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          influencerId: testInfluencerId
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/admin/redemptions - manual redemption entry', async () => {
      const response = await fetch('/api/admin/redemptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          couponCode: testCouponId,
          amount: 15.50,
          source: 'manual'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.redemptionId).toBeTruthy();
    });

    test('POST /api/admin/announcements - create announcement', async () => {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Test Announcement',
          content: 'This is a test announcement',
          targetRoles: ['business', 'influencer'],
          priority: 'medium'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.announcementId).toBeTruthy();
    });
  });

  describe('Messaging API Routes', () => {
    test('POST /api/admin/messages/conversations - create conversation', async () => {
      const response = await fetch('/api/admin/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          businessId: testBusinessId,
          influencerId: testInfluencerId
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.conversationId).toBeTruthy();
    });

    test('POST /api/admin/messages/send - send message', async () => {
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          conversationId: 'test-conversation-id',
          content: 'Test message content'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.messageId).toBeTruthy();
    });
  });

  describe('Export Functionality', () => {
    test('GET /api/admin/export/metrics - CSV export', async () => {
      const response = await fetch('/api/admin/export/metrics?format=csv', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });

    test('GET /api/business/export/performance - business performance export', async () => {
      const response = await fetch('/api/business/export/performance?format=csv', {
        headers: {
          'Authorization': `Bearer ${businessToken}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });
  });

  describe('Error Handling', () => {
    test('API routes return proper JSON errors', async () => {
      const response = await fetch('/api/admin/redemptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No authorization header
        },
        body: JSON.stringify({
          couponCode: 'TEST123',
          amount: 10
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeTruthy();
      expect(typeof data.error).toBe('object');
    });

    test('Invalid request data returns validation errors', async () => {
      const response = await fetch('/api/business/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({
          title: '', // Invalid empty title
          discountPct: 150 // Invalid percentage > 100
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();
      expect(data.error.issues).toBeTruthy(); // Zod validation errors
    });
  });
});
