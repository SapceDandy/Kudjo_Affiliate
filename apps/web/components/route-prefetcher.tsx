'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDemoAuth } from '@/lib/demo-auth';

export function RoutePrefetcher() {
  const router = useRouter();
  const { user } = useDemoAuth();

  useEffect(() => {
    if (!user) return;

    // Prefetch likely navigation routes based on user role
    const routesToPrefetch = {
      influencer: ['/influencer', '/influencer/campaigns', '/influencer/earnings'],
      business: ['/business', '/business/campaigns', '/business/analytics'],
      admin: ['/control-center', '/control-center/users', '/control-center/analytics']
    };

    const routes = routesToPrefetch[user.role] || [];
    
    // Prefetch routes with a small delay to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      routes.forEach(route => {
        router.prefetch(route);
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user, router]);

  return null;
}
