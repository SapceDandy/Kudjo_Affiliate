import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import InfluencerPage from '../page';
import { useNearbyOffers } from '@/lib/hooks/use-nearby-offers';

// Mock hooks
jest.mock('@/lib/hooks/use-nearby-offers');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ code: 'TEST123', qrUrl: 'data:image/png;base64,MOCK' }),
  })
) as jest.Mock;

describe('InfluencerPage', () => {
  const mockOffers = [
    {
      id: 'o1',
      title: 'Test Offer',
      description: 'Test Description',
      splitPct: 20,
      businessName: 'Test Business',
      distance: 1.5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useNearbyOffers as jest.Mock).mockReturnValue({
      offers: mockOffers,
      loading: false,
      error: null,
    });
  });

  it('renders loading state', () => {
    (useNearbyOffers as jest.Mock).mockReturnValue({
      offers: [],
      loading: true,
      error: null,
    });
    render(<InfluencerPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = 'Failed to load offers';
    (useNearbyOffers as jest.Mock).mockReturnValue({
      offers: [],
      loading: false,
      error,
    });
    render(<InfluencerPage />);
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    (useNearbyOffers as jest.Mock).mockReturnValue({
      offers: [],
      loading: false,
      error: null,
    });
    render(<InfluencerPage />);
    expect(screen.getByText('No offers available in your area yet.')).toBeInTheDocument();
  });

  it('renders offers and allows claiming', async () => {
    render(<InfluencerPage />);
    
    // Check offer details are displayed
    expect(screen.getByText('Test Offer')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Split: 20%')).toBeInTheDocument();
    expect(screen.getByText('Business: Test Business')).toBeInTheDocument();
    expect(screen.getByText('Distance: 1.5 miles')).toBeInTheDocument();

    // Click claim button and check dialog
    const claimButton = screen.getByRole('button', { name: /claim content coupon/i });
    fireEvent.click(claimButton);

    // Check dialog content
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/By claiming this coupon/)).toBeInTheDocument();
    });

    // Click claim in dialog
    const dialogClaimButton = screen.getByRole('button', { name: /claim coupon/i });
    fireEvent.click(dialogClaimButton);

    // Check success state
    await waitFor(() => {
      expect(screen.getByText('TEST123')).toBeInTheDocument();
      expect(screen.getByAltText('Coupon QR Code')).toBeInTheDocument();
    });
  });

  it('handles claim error', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
      })
    );

    render(<InfluencerPage />);
    
    // Click claim button
    const claimButton = screen.getByRole('button', { name: /claim content coupon/i });
    fireEvent.click(claimButton);

    // Click claim in dialog
    const dialogClaimButton = screen.getByRole('button', { name: /claim coupon/i });
    fireEvent.click(dialogClaimButton);

    // Check error state
    await waitFor(() => {
      expect(screen.getByText('Failed to claim coupon. Please try again.')).toBeInTheDocument();
    });
  });
}); 