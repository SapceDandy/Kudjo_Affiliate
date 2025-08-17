import { render, screen, fireEvent } from '@testing-library/react';
import { PosSelectionForm } from '../pos-selection-form';

describe('PosSelectionForm', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider options', () => {
    render(<PosSelectionForm onNext={mockOnNext} initialData={{ posProvider: '' }} />);
    expect(screen.getByText('Square')).toBeInTheDocument();
    expect(screen.getByText('Manual Mode')).toBeInTheDocument();
  });

  it('renders with pre-selected provider', () => {
    render(<PosSelectionForm onNext={mockOnNext} initialData={{ posProvider: 'square' }} />);
    const squareCard = screen.getByRole('button', { name: /square/i });
    expect(squareCard).toHaveClass('cursor-pointer');
    expect(squareCard).toHaveClass('border-primary');
  });

  it('calls onNext with selected provider', () => {
    render(<PosSelectionForm onNext={mockOnNext} initialData={{ posProvider: '' }} />);
    const squareCard = screen.getByRole('button', { name: /square/i });
    fireEvent.click(squareCard);
    expect(mockOnNext).toHaveBeenCalledWith({ posProvider: 'square' });
  });
}); 