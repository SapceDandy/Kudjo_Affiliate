import { render, screen } from '@testing-library/react';
import { Loading } from '../loading';

describe('Loading', () => {
  it('renders with default text', () => {
    const { container } = render(<Loading />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'space-y-2');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    const { container } = render(<Loading text="Please wait" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'space-y-2');
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('renders spinner component', () => {
    const { container } = render(<Loading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders text with correct styling', () => {
    const { container } = render(<Loading />);
    const text = container.querySelector('.text-sm.text-muted-foreground');
    expect(text).toBeInTheDocument();
    expect(text).toHaveTextContent('Loading...');
  });
}); 