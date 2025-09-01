'use client';

import Link from 'next/link';
import Image from 'next/image';
import { OptimizedButton } from '@/components/optimized-button';
import { useDemoAuth } from '@/lib/demo-auth';

export function Header() {
  const { user, signOut } = useDemoAuth();

  const getPrimaryLink = () => {
    if (!user) return null;
    if (user.role === 'admin') return { href: '/control-center', label: 'Control Center' };
    if (user.role === 'business') return { href: '/business', label: 'Dashboard' };
    if (user.role === 'influencer') return { href: '/influencer', label: 'Dashboard' };
    return null;
  };

  const primary = getPrimaryLink();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Kudjo"
            width={100}
            height={32}
            className="h-8"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              <OptimizedButton 
                variant="outline" 
                onClick={() => signOut()}
                className="border-brand text-brand hover:bg-brand-dark"
              >
                Sign Out
              </OptimizedButton>
            </>
          ) : (
            <OptimizedButton 
              href="/auth/signin"
              className="bg-brand hover:bg-brand-light"
            >
              Sign In
            </OptimizedButton>
          )}
        </nav>
      </div>
    </header>
  );
} 