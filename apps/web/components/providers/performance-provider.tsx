'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface PerformanceContextType {
  prefetchRoute: (href: string) => void;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const prefetchRoute = (href: string) => {
    router.prefetch(href);
  };

  useEffect(() => {
    // Prefetch common routes on app load
    const commonRoutes = [
      '/influencer',
      '/business', 
      '/control-center',
      '/auth/signin'
    ];

    const timeoutId = setTimeout(() => {
      commonRoutes.forEach(route => {
        router.prefetch(route);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <PerformanceContext.Provider value={{ prefetchRoute }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}
