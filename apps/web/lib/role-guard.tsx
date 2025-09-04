'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'business' | 'influencer')[];
  fallbackPath?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackPath = '/auth/signin' }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(fallbackPath);
      return;
    }

    const isAdmin = user.role === 'admin';
    const isBusiness = user.role === 'business';
    const isInfluencer = user.role === 'influencer';

    const hasAllowedRole = (
      (isAdmin && allowedRoles.includes('admin')) ||
      (isBusiness && allowedRoles.includes('business')) ||
      (isInfluencer && allowedRoles.includes('influencer'))
    );

    if (!hasAllowedRole) {
      // Redirect to the correct dashboard for the user's role
      if (isAdmin) {
        router.push('/control-center');
      } else if (isBusiness) {
        router.push('/business');
      } else if (isInfluencer) {
        router.push('/influencer');
      } else {
        router.push(fallbackPath);
      }
    } else {
      setAuthorized(true);
    }
  }, [user, loading, allowedRoles, router, fallbackPath]);

  if (loading || !authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-brand rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 