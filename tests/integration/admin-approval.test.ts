import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as approveUser } from '@/app/api/admin/approve-user/route';
import { POST as rejectUser } from '@/app/api/admin/reject-user/route';
import { GET as pendingApprovals } from '@/app/api/admin/pending-approvals/route';

// Mock Firebase Admin
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
};

const mockDoc = {
  exists: true,
  data: vi.fn(),
  id: 'test-user-id',
};

const mockCollection = {
  doc: vi.fn(() => ({
    get: vi.fn(() => Promise.resolve(mockDoc)),
    update: vi.fn(() => Promise.resolve()),
  })),
  where: vi.fn(() => ({
    limit: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({
        docs: [mockDoc],
        empty: false,
      })),
    })),
  })),
};

vi.mock('@/lib/firebase-admin', () => ({
  initializeFirebaseAdmin: vi.fn(() => Promise.resolve({
    db: {
      collection: vi.fn(() => mockCollection),
    },
  })),
}));

vi.mock('@/lib/auth-server', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({
    uid: 'admin-user-id',
    email: 'admin@test.com',
    role: 'admin',
  })),
}));

describe('Admin Approval Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Approve User API', () => {
    it('should successfully approve a pending user', async () => {
      // Mock user data
      mockDoc.data.mockReturnValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        approvalStatus: 'pending',
        approved: false,
        approvalHistory: [],
      });

      const request = new NextRequest('http://localhost:3000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: 'Test approval',
        }),
      });

      const response = await approveUser(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('approved successfully');
      expect(result.userId).toBe('test-user-id');
    });

    it('should prevent duplicate approval requests', async () => {
      // Mock user with processing status
      mockDoc.data.mockReturnValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        approvalStatus: 'processing',
        approved: false,
        approvalHistory: [],
      });

      const request = new NextRequest('http://localhost:3000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: 'Test approval',
        }),
      });

      const response = await approveUser(request);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.error.code).toBe('DUPLICATE_REQUEST');
      expect(result.error.message).toContain('already has an approval request being processed');
    });

    it('should prevent approving already approved users', async () => {
      // Mock already approved user
      mockDoc.data.mockReturnValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        approvalStatus: 'approved',
        approved: true,
        approvalHistory: [],
      });

      const request = new NextRequest('http://localhost:3000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: 'Test approval',
        }),
      });

      const response = await approveUser(request);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.error.code).toBe('ALREADY_APPROVED');
      expect(result.error.message).toContain('already approved');
    });

    it('should return 404 for non-existent users', async () => {
      // Mock non-existent user
      mockDoc.exists = false;

      const request = new NextRequest('http://localhost:3000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'non-existent-user',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: 'Test approval',
        }),
      });

      const response = await approveUser(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('should validate request data with Zod schema', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          // Missing required fields
          userId: '',
          userType: 'invalid-type',
        }),
      });

      const response = await approveUser(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Reject User API', () => {
    beforeEach(() => {
      mockDoc.exists = true;
    });

    it('should successfully reject a pending user', async () => {
      // Mock user data
      mockDoc.data.mockReturnValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        approvalStatus: 'pending',
        approved: false,
        approvalHistory: [],
      });

      const request = new NextRequest('http://localhost:3000/api/admin/reject-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: 'Test rejection reason',
        }),
      });

      const response = await rejectUser(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('rejected successfully');
      expect(result.canReapplyAt).toBeDefined();
    });

    it('should prevent duplicate rejection requests', async () => {
      // Mock user with processing status
      mockDoc.data.mockReturnValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        approvalStatus: 'processing',
        approved: false,
        approvalHistory: [],
      });

      const request = new NextRequest('http://localhost:3000/api/admin/reject-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: 'Test rejection reason',
        }),
      });

      const response = await rejectUser(request);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.error.code).toBe('DUPLICATE_REQUEST');
    });

    it('should prevent rejecting users still in cooldown', async () => {
      // Mock recently rejected user still in cooldown
      const futureDate = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12 hours from now
      mockDoc.data.mockReturnValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        approvalStatus: 'rejected',
        approved: false,
        canReapplyAt: futureDate,
        approvalHistory: [],
      });

      const request = new NextRequest('http://localhost:3000/api/admin/reject-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: 'Test rejection reason',
        }),
      });

      const response = await rejectUser(request);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.error.code).toBe('ALREADY_REJECTED');
      expect(result.error.message).toContain('recently rejected');
    });

    it('should require rejection reason', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/reject-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id',
          reason: '', // Empty reason
        }),
      });

      const response = await rejectUser(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Pending Approvals API', () => {
    it('should fetch pending approvals successfully', async () => {
      // Mock pending users
      const mockBusinessDoc = {
        id: 'business-1',
        data: () => ({
          id: 'business-1',
          businessName: 'Test Business',
          email: 'business@test.com',
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
        }),
      };

      const mockInfluencerDoc = {
        id: 'influencer-1',
        data: () => ({
          id: 'influencer-1',
          name: 'Test Influencer',
          email: 'influencer@test.com',
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
        }),
      };

      mockCollection.where.mockReturnValue({
        limit: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({
            docs: [mockBusinessDoc, mockInfluencerDoc],
            empty: false,
          })),
        })),
      });

      const request = new NextRequest('http://localhost:3000/api/admin/pending-approvals', {
        method: 'GET',
        headers: {
          'x-admin-bypass': 'true',
        },
      });

      const response = await pendingApprovals(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.businesses).toBeDefined();
      expect(result.data.influencers).toBeDefined();
      expect(result.data.totalPending).toBeGreaterThan(0);
    });

    it('should require admin authentication', async () => {
      // Mock non-admin user
      vi.mocked(require('@/lib/auth-server').getCurrentUser).mockResolvedValueOnce({
        uid: 'regular-user-id',
        email: 'user@test.com',
        role: 'influencer',
      });

      const request = new NextRequest('http://localhost:3000/api/admin/pending-approvals', {
        method: 'GET',
      });

      const response = await pendingApprovals(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Race Condition Handling', () => {
    it('should handle concurrent approval attempts gracefully', async () => {
      // Mock user data
      mockDoc.data.mockReturnValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        approvalStatus: 'pending',
        approved: false,
        approvalHistory: [],
      });

      // Mock update to fail on second call (simulating race condition)
      const mockUpdate = vi.fn()
        .mockResolvedValueOnce(undefined) // First processing update succeeds
        .mockRejectedValueOnce(new Error('Document was modified')); // Second update fails

      mockCollection.doc.mockReturnValue({
        get: vi.fn(() => Promise.resolve(mockDoc)),
        update: mockUpdate,
      });

      const request1 = new NextRequest('http://localhost:3000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id-1',
          reason: 'First approval attempt',
        }),
      });

      const request2 = new NextRequest('http://localhost:3000/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-bypass': 'true',
        },
        body: JSON.stringify({
          userId: 'test-user-id',
          userType: 'influencer',
          adminId: 'admin-user-id-2',
          reason: 'Second approval attempt',
        }),
      });

      // Execute both requests concurrently
      const [response1, response2] = await Promise.all([
        approveUser(request1),
        approveUser(request2),
      ]);

      // One should succeed, one should fail
      const results = await Promise.all([
        response1.json(),
        response2.json(),
      ]);

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => r.error).length;

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);
    });
  });
});
