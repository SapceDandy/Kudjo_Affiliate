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
    // Still loading auth state
    if (loading) {
      return;
    }

    // No user, redirect to signin
    if (!user) {
      router.push(fallbackPath);
      return;
    }

    // Check if user has admin role (from cookie)
    const isAdmin = user.role === 'admin';
    
    // Check if user has business role
    const isBusiness = user.role === 'business';
    
    // Check if user has influencer role
    const isInfluencer = user.role === 'influencer';

    // Determine if user is authorized
    const hasAllowedRole = (
      (isAdmin && allowedRoles.includes('admin')) ||
      (isBusiness && allowedRoles.includes('business')) ||
      (isInfluencer && allowedRoles.includes('influencer'))
    );

    if (!hasAllowedRole) {
      // Redirect based on user's role if they're not authorized
      if (isAdmin) {
        router.push('/admin/dashboard');
      } else if (isBusiness) {
        router.push('/business/dashboard');
      } else if (isInfluencer) {
        router.push('/influencer/dashboard');
      } else {
        router.push(fallbackPath);
      }
    } else {
      setAuthorized(true);
    }
  }, [user, loading, allowedRoles, router, fallbackPath]);

  // Show loading state while checking authorization
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