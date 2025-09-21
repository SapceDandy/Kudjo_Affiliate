import { render, screen, fireEvent } from '@testing-library/react';
import { PosSelectionForm } from '../pos-selection-form';

describe('PosSelectionForm', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider options', () => {
    const mockData = {
      name: 'Test Business',
      address: '123 Test St',
      website: 'https://test.com',
      overview: 'Test overview',
      defaultSplitPct: 20,
      posProvider: 'manual' as const,
    };
    render(<PosSelectionForm onNext={mockOnNext} initialData={mockData} />);
    expect(screen.getByText('Square')).toBeInTheDocument();
    expect(screen.getByText('Manual Mode')).toBeInTheDocument();
  });

  it('renders with pre-selected provider', () => {
    const mockData = {
      name: 'Test Business',
      address: '123 Test St',
      website: 'https://test.com',
      overview: 'Test overview',
      defaultSplitPct: 20,
      posProvider: 'square' as const,
    };
    render(<PosSelectionForm onNext={mockOnNext} initialData={mockData} />);
    const squareCard = screen.getByRole('button', { name: /square/i });
    expect(squareCard).toHaveClass('cursor-pointer');
    expect(squareCard).toHaveClass('border-primary');
  });

  it('calls onNext with selected provider', () => {
    const mockData = {
      name: 'Test Business',
      address: '123 Test St',
      website: 'https://test.com',
      overview: 'Test overview',
      defaultSplitPct: 20,
      posProvider: 'manual' as const,
    };
    render(<PosSelectionForm onNext={mockOnNext} initialData={mockData} />);
    const squareCard = screen.getByRole('button', { name: /square/i });
    fireEvent.click(squareCard);
    expect(mockOnNext).toHaveBeenCalledWith({ posProvider: 'square' });
  });
}); 