import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ empty: true, docs: [] }))
      })),
      doc: jest.fn(() => ({
        set: jest.fn(() => Promise.resolve()),
        get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ title: 'Test Offer', bizId: 'test-biz' }) }))
      }))
    }))
  }
}));

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

describe('/api/coupon/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/coupon/create', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid request data');
  });

  it('should create AFFILIATE coupon with link', async () => {
    const request = new NextRequest('http://localhost:3000/api/coupon/create', {
      method: 'POST',
      body: JSON.stringify({
        type: 'AFFILIATE',
        bizId: 'test-biz',
        infId: 'test-inf',
        offerId: 'test-offer'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.couponId).toBeDefined();
    expect(data.code).toBeDefined();
    expect(data.link).toBeDefined();
    expect(data.link.url).toContain('/r/');
    expect(data.link.qrUrl).toContain('/qr/');
  });

  it('should create CONTENT_MEAL coupon without link', async () => {
    const request = new NextRequest('http://localhost:3000/api/coupon/create', {
      method: 'POST',
      body: JSON.stringify({
        type: 'CONTENT_MEAL',
        bizId: 'test-biz',
        infId: 'test-inf',
        offerId: 'test-offer'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.couponId).toBeDefined();
    expect(data.code).toBeDefined();
    expect(data.link).toBeUndefined();
  });

  it('should handle cooldown enforcement', async () => {
    // Mock recent coupon exists
    const mockAdminDb = require('@/lib/firebase-admin').adminDb;
    mockAdminDb.collection.mockReturnValue({
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ 
          empty: false, 
          docs: [{ data: () => ({ createdAt: new Date() }) }] 
        }))
      })),
      doc: jest.fn(() => ({
        set: jest.fn(() => Promise.resolve()),
        get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ title: 'Test Offer', bizId: 'test-biz' }) }))
      }))
    });

    const request = new NextRequest('http://localhost:3000/api/coupon/create', {
      method: 'POST',
      body: JSON.stringify({
        type: 'AFFILIATE',
        bizId: 'test-biz',
        infId: 'test-inf',
        offerId: 'test-offer'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Creation temporarily blocked');
  });
});
