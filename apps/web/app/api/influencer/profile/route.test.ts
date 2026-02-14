// Mock dependencies
jest.mock('@/lib/auth-server', () => ({
  getCurrentUser: jest.fn()
}));

jest.mock('@/lib/firebase-admin', () => ({
  initializeFirebaseAdmin: jest.fn()
}));

const { NextRequest } = require('next/server');
const { GET } = require('./route');
const { getCurrentUser } = require('@/lib/auth-server');
const { initializeFirebaseAdmin } = require('@/lib/firebase-admin');

describe('/api/influencer/profile', () => {
  const mockGet = jest.fn();
  const mockDocRef = {
    get: mockGet
  };
  const mockCollectionRef = {
    doc: jest.fn(() => mockDocRef)
  };
  const mockDb = {
    collection: jest.fn(() => mockCollectionRef)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (initializeFirebaseAdmin as jest.Mock).mockResolvedValue({ db: mockDb });
  });

  it('should return approved status when admin approved influencer', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });
    
    const mockDoc = {
      exists: true,
      data: () => ({
        handle: 'testuser',
        status: 'approved', // Admin approved
        tier: 'platinum',
        socialMedia: {
          instagram: {
            username: 'testuser',
            followersCount: 15000,
            isVerified: true
          }
        }
      })
    };

    mockGet.mockResolvedValue(mockDoc);

    const request = new NextRequest('http://localhost:3000/api/influencer/profile?uid=test-user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.profile.approved).toBe(true);
    expect(data.profile.hasVerifiedSocial).toBe(true);
    expect(data.profile.socialAccounts).toHaveLength(1);
    expect(data.profile.socialAccounts[0].platform).toBe('instagram');
  });

  it('should return approved status with explicit approved field', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });
    
    const mockDoc = {
      exists: true,
      data: () => ({
        handle: 'testuser',
        approved: true, // Explicit approved field
        hasVerifiedSocial: true,
        tier: 'gold'
      })
    };

    mockGet.mockResolvedValue(mockDoc);

    const request = new NextRequest('http://localhost:3000/api/influencer/profile?uid=test-user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.approved).toBe(true);
    expect(data.profile.hasVerifiedSocial).toBe(true);
  });

  it('should return not approved for pending status', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });
    
    const mockDoc = {
      exists: true,
      data: () => ({
        handle: 'testuser',
        status: 'pending',
        tier: 'bronze'
      })
    };

    mockGet.mockResolvedValue(mockDoc);

    const request = new NextRequest('http://localhost:3000/api/influencer/profile?uid=test-user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.approved).toBe(false);
    expect(data.profile.hasVerifiedSocial).toBe(false);
  });
});
