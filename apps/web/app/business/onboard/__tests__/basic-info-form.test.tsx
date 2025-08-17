import { render, screen, fireEvent } from '@testing-library/react';
import { BasicInfoForm } from '../basic-info-form';

describe('BasicInfoForm', () => {
  const mockOnNext = jest.fn();
  const initialData = {
    name: '',
    address: '',
    defaultSplitPct: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial data', () => {
    render(<BasicInfoForm onNext={mockOnNext} initialData={initialData} />);
    expect(screen.getByLabelText('Business Name')).toHaveValue('');
    expect(screen.getByLabelText('Address')).toHaveValue('');
    expect(screen.getByLabelText('Default Split % for Influencers')).toHaveValue(20);
  });

  it('updates form values on change', () => {
    render(<BasicInfoForm onNext={mockOnNext} initialData={initialData} />);
    
    fireEvent.change(screen.getByLabelText('Business Name'), { target: { value: 'Test Biz' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText('Default Split % for Influencers'), { target: { value: '25' } });

    expect(screen.getByLabelText('Business Name')).toHaveValue('Test Biz');
    expect(screen.getByLabelText('Address')).toHaveValue('123 Test St');
    expect(screen.getByLabelText('Default Split % for Influencers')).toHaveValue(25);
  });

  it('calls onNext with form data on submit', () => {
    render(<BasicInfoForm onNext={mockOnNext} initialData={initialData} />);
    
    fireEvent.change(screen.getByLabelText('Business Name'), { target: { value: 'Test Biz' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText('Default Split % for Influencers'), { target: { value: '25' } });
    fireEvent.click(screen.getByText('Next'));

    expect(mockOnNext).toHaveBeenCalledWith({
      name: 'Test Biz',
      address: '123 Test St',
      defaultSplitPct: 25,
    });
  });

  it('validates split percentage range', () => {
    render(<BasicInfoForm onNext={mockOnNext} initialData={initialData} />);
    
    fireEvent.change(screen.getByLabelText('Default Split % for Influencers'), { target: { value: '101' } });
    fireEvent.click(screen.getByText('Next'));

    expect(mockOnNext).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Default Split % for Influencers')).toBeInvalid();
  });

  it('renders with pre-filled data', () => {
    const prefilledData = {
      name: 'Existing Biz',
      address: '456 Old St',
      defaultSplitPct: 30,
    };
    render(<BasicInfoForm onNext={mockOnNext} initialData={prefilledData} />);
    
    expect(screen.getByLabelText('Business Name')).toHaveValue('Existing Biz');
    expect(screen.getByLabelText('Address')).toHaveValue('456 Old St');
    expect(screen.getByLabelText('Default Split % for Influencers')).toHaveValue(30);
  });
}); 