import { renderHook, waitFor } from '@testing-library/react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNearbyOffers } from '../use-nearby-offers';
import { useAuth } from '@/lib/auth';

// Mock the auth hook
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}));

// Mock Firestore data
const mockOfferDoc = {
  id: 'offer1',
  data: () => ({
    title: 'Test Offer',
    description: 'Test Description',
    splitPct: 20,
    bizId: 'biz1',
  }),
};

const mockBizDoc = {
  data: () => ({
    name: 'Test Business',
    geo: { lat: 37.7739, lng: -122.4312 }, // ~0.65 miles from test location
  }),
};

describe('useNearbyOffers', () => {
  beforeEach(() => {
    // Mock auth user
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'user1' },
    });

    // Mock Firestore queries
    (collection as jest.Mock).mockReturnValue('offers');
    (query as jest.Mock).mockReturnValue('query');
    (where as jest.Mock).mockReturnValue('where');
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [mockOfferDoc],
    });
    (doc as jest.Mock).mockReturnValue('bizRef');
    (getDoc as jest.Mock).mockResolvedValue(mockBizDoc);
  });

  it('fetches and filters nearby offers', async () => {
    const { result } = renderHook(() => useNearbyOffers());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.offers).toEqual([]);

    // Wait for data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check offers are processed
    expect(result.current.offers).toHaveLength(1);
    expect(result.current.offers[0]).toMatchObject({
      id: 'offer1',
      title: 'Test Offer',
      description: 'Test Description',
      splitPct: 20,
      businessName: 'Test Business',
    });

    // Check distance is calculated (~0.65 miles)
    expect(result.current.offers[0].distance).toBeCloseTo(0.65, 1);
  });

  it('handles geolocation error', async () => {
    // Mock geolocation error
    (global.navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementationOnce(
      (_, error) => error(new Error('Geolocation denied'))
    );

    const { result } = renderHook(() => useNearbyOffers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load nearby offers. Please enable location access.');
    expect(result.current.offers).toEqual([]);
  });

  it('filters out distant offers', async () => {
    // Mock a distant business
    (getDoc as jest.Mock).mockResolvedValue({
      data: () => ({
        name: 'Far Business',
        geo: { lat: 40.7128, lng: -74.0060 }, // NYC coordinates
      }),
    });

    const { result } = renderHook(() => useNearbyOffers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.offers).toHaveLength(0);
  });
}); 