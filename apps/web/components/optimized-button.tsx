'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTransition, startTransition } from 'react';
import { LoadingSpinner } from './loading-spinner';
import { useLoading } from './global-loading-overlay';

interface OptimizedButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  loadingMessage?: string;
}

export function OptimizedButton({
  href,
  onClick,
  children,
  variant,
  size,
  className,
  disabled,
  type = 'button',
  loadingMessage = 'Navigating...'
}: OptimizedButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showLoadingOverlay, hideLoadingOverlay } = useLoading();

  const handleClick = () => {
    if (href) {
      showLoadingOverlay(loadingMessage);
      startTransition(() => {
        router.push(href);
        // Hide loading after a short delay to allow page to start loading
        setTimeout(() => hideLoadingOverlay(), 500);
      });
    } else if (onClick) {
      startTransition(() => {
        onClick();
      });
    }
  };

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isPending}
      onClick={handleClick}
    >
      <span className="flex items-center gap-2">
        {isPending && <LoadingSpinner size="sm" />}
        {children}
      </span>
    </Button>
  );
}
