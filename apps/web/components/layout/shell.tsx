'use client';

import { Header } from './header';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useLoading } from '@/components/global-loading-overlay';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showLoadingOverlay, hideLoadingOverlay } = useLoading();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
} 