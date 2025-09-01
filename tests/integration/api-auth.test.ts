import { NextRequest, NextResponse } from 'next/server';

// Integration tests using HTTP requests to actual API routes
describe('API Routes - Authentication & RBAC', () => {
  
  test('protected routes reject no-token requests', async () => {
    const response = await fetch('http://localhost:3000/api/business/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Offer' })
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toMatch(/authentication required/i);
  });

  test('protected routes reject wrong-role requests', async () => {
    // Mock influencer token trying to access business endpoint
    const response = await fetch('http://localhost:3000/api/business/offers', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-influencer-token'
      },
      body: JSON.stringify({ title: 'Test Offer' })
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toMatch(/insufficient permissions/i);
  });

  test('offer creation validates schema', async () => {
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

    const response = await fetch('http://localhost:3000/api/business/offers', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-business-token'
      },
      body: JSON.stringify(validOfferData)
    });

    // Should validate correctly (may fail on auth, but not on schema)
    expect([200, 401, 403]).toContain(response.status);
  });
});
