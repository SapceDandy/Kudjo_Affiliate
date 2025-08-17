import { renderHook, waitFor } from '@testing-library/react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNearbyOffers } from '../use-nearby-offers';
import { useAuth } from '@/lib/auth';

// Mock the auth hook
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}));

// Mock Firebase
jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};
(global.navigator as any).geolocation = mockGeolocation;

describe('useNearbyOffers', () => {
  const mockUser = { uid: 'user1' };
  const mockPosition = {
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    mockGeolocation.getCurrentPosition.mockImplementation((success) => success(mockPosition));
    (collection as jest.Mock).mockReturnValue('offers');
    (query as jest.Mock).mockReturnValue('query');
    (where as jest.Mock).mockReturnValue('where');
    (getDocs as jest.Mock).mockResolvedValue({ docs: [mockOfferDoc] });
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
    const geoError = new Error('Geolocation denied');
    geoError.name = 'GeolocationPositionError';
    mockGeolocation.getCurrentPosition.mockImplementation((_, error) => error(geoError));

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

  it('handles Firestore error', async () => {
    (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

    const { result } = renderHook(() => useNearbyOffers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load offers. Please try again.');
    expect(result.current.offers).toEqual([]);
  });

  it('handles missing business data', async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      data: () => null,
    });

    const { result } = renderHook(() => useNearbyOffers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.offers).toHaveLength(0);
  });

  it('handles missing user', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useNearbyOffers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Please sign in to view offers.');
    expect(result.current.offers).toEqual([]);
  });
}); 