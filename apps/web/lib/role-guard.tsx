'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth';

type Role = 'influencer' | 'business' | 'admin';

interface RoleGuardProps {
  children: React.ReactNode;
  role: Role;
}

export function RoleGuard({ children, role }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin');
      return;
    }

    // Check if user is devon@getkudjo.com for admin access
    if (role === 'admin' && user?.email !== 'devon@getkudjo.com') {
      router.replace('/');
      return;
    }

    // For non-admin routes, check user role
    if (role !== 'admin') {
      const userRole = user?.customClaims?.role || 'influencer';
      if (!loading && userRole !== role) {
        router.replace('/');
      }
    }
  }, [user, loading, role, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
} 