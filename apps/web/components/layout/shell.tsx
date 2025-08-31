'use client';

import { Header } from './header';
import { useDemoAuth } from '@/lib/demo-auth';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { user, switchToInfluencer, switchToBusiness } = useDemoAuth();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Demo User Switcher */}
      <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Demo Mode:</span>
            <span className="text-yellow-800">
              {user?.displayName} ({user?.role})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={switchToInfluencer}
              className={`px-3 py-1 rounded text-xs font-medium ${
                user?.role === 'influencer'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Switch to Influencer
            </button>
            <button
              onClick={switchToBusiness}
              className={`px-3 py-1 rounded text-xs font-medium ${
                user?.role === 'business'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Switch to Business
            </button>
          </div>
        </div>
      </div>
      <Header />
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
} 