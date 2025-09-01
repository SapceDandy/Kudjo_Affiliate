'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PageLoading } from './loading-spinner';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (isLoading) {
    return <PageLoading message="Loading page..." />;
  }

  return <>{children}</>;
}
