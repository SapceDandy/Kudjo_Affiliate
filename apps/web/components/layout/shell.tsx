'use client';

import { Header } from './header';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
} 