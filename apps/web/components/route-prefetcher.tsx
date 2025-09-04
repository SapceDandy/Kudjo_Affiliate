'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function RoutePrefetcher() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.role) return;

    // Prefetch likely navigation routes based on user role
    const routesToPrefetch: Record<string, string[]> = {
      influencer: ['/influencer', '/influencer/campaigns', '/influencer/earnings'],
      business: ['/business', '/business/campaigns', '/business/analytics'],
      admin: ['/control-center', '/control-center/users', '/control-center/analytics']
    };

    const routes = routesToPrefetch[user.role];
    if (!routes) return;

    // Prefetch routes with a small delay to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      routes.forEach((route: string) => {
        router.prefetch(route);
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user, router]);

  return null;
}
