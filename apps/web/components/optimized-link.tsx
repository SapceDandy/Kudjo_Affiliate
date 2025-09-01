'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, startTransition } from 'react';
import { LoadingSpinner } from './loading-spinner';

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

export function OptimizedLink({ 
  href, 
  children, 
  className, 
  prefetch = true 
}: OptimizedLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link 
      href={href} 
      className={className}
      prefetch={prefetch}
      onClick={handleClick}
    >
      <span className="flex items-center gap-2">
        {isPending && <LoadingSpinner size="sm" />}
        {children}
      </span>
    </Link>
  );
}
