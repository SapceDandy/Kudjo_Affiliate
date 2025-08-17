import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PosSetupForm } from '../pos-setup-form';

// Mock window.location
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('PosSetupForm', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  describe('Square setup', () => {
    const squareData = { posProvider: 'square' };

    it('renders Square connection UI', () => {
      render(<PosSetupForm onNext={mockOnNext} initialData={squareData} />);
      expect(screen.getByRole('heading', { name: /connect square account/i })).toBeInTheDocument();
      expect(screen.getByText(/you'll be redirected to square/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect square account/i })).toBeInTheDocument();
    });

    it('redirects to Square OAuth on button click', () => {
      render(<PosSetupForm onNext={mockOnNext} initialData={squareData} />);
      const connectButton = screen.getByRole('button', { name: /connect square account/i });
      fireEvent.click(connectButton);

      const expectedScope = encodeURIComponent('PAYMENTS_READ ORDERS_READ ITEMS_READ');
      expect(window.location.href).toContain('connect.squareup.com/oauth2/authorize');
      expect(window.location.href).toContain(`scope=${expectedScope}`);
    });
  });

  describe('Manual Mode setup', () => {
    const manualData = { posProvider: 'manual' };

    it('renders manual mode setup UI', () => {
      render(<PosSetupForm onNext={mockOnNext} initialData={manualData} />);
      expect(screen.getByRole('heading', { name: /set up manual mode/i })).toBeInTheDocument();
      expect(screen.getByText(/enter redemption codes at checkout/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enable manual mode/i })).toBeInTheDocument();
    });

    it('enables manual mode on button click', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ posStatus: 'connected' }),
        })
      ) as jest.Mock;

      render(<PosSetupForm onNext={mockOnNext} initialData={manualData} />);
      const enableButton = screen.getByRole('button', { name: /enable manual mode/i });
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/business.pos.connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'manual' }),
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    it('handles manual mode setup error', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as jest.Mock;

      render(<PosSetupForm onNext={mockOnNext} initialData={manualData} />);
      const enableButton = screen.getByRole('button', { name: /enable manual mode/i });
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to set up manual mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Clover setup', () => {
    const cloverData = { posProvider: 'clover' };

    it('shows unavailable message for Clover', () => {
      render(<PosSetupForm onNext={mockOnNext} initialData={cloverData} />);
      expect(screen.getByRole('heading', { name: /clover integration/i })).toBeInTheDocument();
      expect(screen.getByText(/not available in the mvp/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('allows going back from Clover screen', () => {
      const mockHistoryBack = jest.fn();
      window.history.back = mockHistoryBack;

      render(<PosSetupForm onNext={mockOnNext} initialData={cloverData} />);
      const backButton = screen.getByRole('button', { name: /go back/i });
      fireEvent.click(backButton);
      expect(mockHistoryBack).toHaveBeenCalled();
    });
  });
}); 