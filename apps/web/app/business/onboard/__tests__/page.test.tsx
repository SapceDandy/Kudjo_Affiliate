import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import OnboardPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ bizId: 'b1' }),
  })
) as jest.Mock;

describe('OnboardPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('renders basic info form initially', () => {
    render(<OnboardPage />);
    expect(screen.getByText('Business Onboarding')).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default split/i)).toBeInTheDocument();
  });

  it('validates required fields in basic info form', async () => {
    render(<OnboardPage />);
    
    // Submit empty form
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    // Wait for validation errors
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/business name/i);
      const addressInput = screen.getByLabelText(/address/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(addressInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('advances to POS selection after valid basic info', async () => {
    render(<OnboardPage />);
    
    // Fill out form
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'Test Biz' } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText(/default split/i), { target: { value: '20' } });

    // Submit form
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    // Check POS selection screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /select pos provider/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /square/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /manual mode/i })).toBeInTheDocument();
    });
  });

  it('handles Square selection', async () => {
    render(<OnboardPage />);
    
    // Fill out basic info
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'Test Biz' } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Test St' } });
    
    // Submit form
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    // Select Square
    await waitFor(() => {
      const squareCard = screen.getByRole('button', { name: /square/i });
      fireEvent.click(squareCard);
    });

    // Check Square setup screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /connect square account/i })).toBeInTheDocument();
    });
  });

  it('handles Manual Mode selection', async () => {
    render(<OnboardPage />);
    
    // Fill out basic info
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'Test Biz' } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Test St' } });
    
    // Submit form
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    // Select Manual Mode
    await waitFor(() => {
      const manualCard = screen.getByRole('button', { name: /manual mode/i });
      fireEvent.click(manualCard);
    });

    // Check Manual Mode setup screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /set up manual mode/i })).toBeInTheDocument();
    });
  });

  it('completes onboarding with manual mode', async () => {
    render(<OnboardPage />);
    
    // Fill out basic info
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'Test Biz' } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Test St' } });
    
    // Submit form
    const form = screen.getByRole('form');
    fireEvent.submit(form);

    // Select Manual Mode
    await waitFor(() => {
      const manualCard = screen.getByRole('button', { name: /manual mode/i });
      fireEvent.click(manualCard);
    });

    // Complete setup
    await waitFor(() => {
      const enableButton = screen.getByRole('button', { name: /enable manual mode/i });
      fireEvent.click(enableButton);
    });

    // Check redirect
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/business');
    });
  });
}); 