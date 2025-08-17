import { render } from '@testing-library/react';
import { Spinner } from '../spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-2', 'border-current', 'border-t-transparent', 'h-4', 'w-4');
  });

  it('renders with custom size', () => {
    const { container } = render(<Spinner size="lg" />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-2', 'border-current', 'border-t-transparent', 'h-6', 'w-6');
  });

  it('renders with custom className', () => {
    const { container } = render(<Spinner className="text-primary" />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveClass('text-primary');
  });

  it('renders with all size variants', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const sizeClasses = {
      sm: ['h-3', 'w-3'],
      md: ['h-4', 'w-4'],
      lg: ['h-6', 'w-6'],
    };

    sizes.forEach((size) => {
      const { container } = render(<Spinner size={size} />);
      const spinner = container.firstChild as HTMLElement;
      sizeClasses[size].forEach((className) => {
        expect(spinner).toHaveClass(className);
      });
    });
  });
}); 