'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Kudjo"
            width={100}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              <Link href="/influencer">
                <Button variant="ghost">Influencer</Button>
              </Link>
              <Link href="/business">
                <Button variant="ghost">Business</Button>
              </Link>
              <Link href="/admin">
                <Button variant="ghost">Admin</Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="border-brand text-brand hover:bg-brand-dark"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button className="bg-brand hover:bg-brand-light">
                Sign In
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
} 