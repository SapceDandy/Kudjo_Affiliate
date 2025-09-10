import { NextRequest } from 'next/server';
import { POST } from './route';
import { adminDb } from '@/lib/firebase-admin';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn()
      })),
      add: jest.fn()
    }))
  }
}));

describe('/api/admin/influencers/approve', () => {
  const mockInfluencerRef = {
    get: jest.fn(),
    update: jest.fn()
  };
  
  const mockCollection = {
    doc: jest.fn(() => mockInfluencerRef),
    add: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb!.collection as jest.Mock).mockReturnValue(mockCollection);
  });

  it('should approve influencer and set verification fields', async () => {
    // Mock existing influencer
    mockInfluencerRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ handle: 'testuser', status: 'pending' })
    });

    const request = new NextRequest('http://localhost:3000/api/admin/influencers/approve', {
      method: 'POST',
      body: JSON.stringify({ influencerId: 'test-user-id' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    // Verify update was called with correct fields
    expect(mockInfluencerRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        approved: true,
        hasVerifiedSocial: true,
        reviewedBy: 'admin'
      })
    );

    // Verify review log was created
    expect(mockCollection.add).toHaveBeenCalledWith(
      expect.objectContaining({
        influencerId: 'test-user-id',
        action: 'approve',
        reviewedBy: 'admin'
      })
    );
  });

  it('should return 404 for non-existent influencer', async () => {
    mockInfluencerRef.get.mockResolvedValue({ exists: false });

    const request = new NextRequest('http://localhost:3000/api/admin/influencers/approve', {
      method: 'POST',
      body: JSON.stringify({ influencerId: 'non-existent' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Influencer not found');
  });
});
