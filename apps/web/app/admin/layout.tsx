'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Shield, BarChart3, Tag, Users, Settings } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.href = '/admin/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Skip navigation for login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand" />
            <span className="font-bold text-xl">Admin Portal</span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Sign Out
          </Button>
        </div>
        <div className="container mx-auto px-4">
          <nav className="flex space-x-1">
            <Link href="/admin/dashboard">
              <Button 
                variant={isActive('/admin/dashboard') ? "default" : "ghost"} 
                className={isActive('/admin/dashboard') ? "bg-brand hover:bg-brand/90" : ""}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/coupons">
              <Button 
                variant={isActive('/admin/coupons') ? "default" : "ghost"}
                className={isActive('/admin/coupons') ? "bg-brand hover:bg-brand/90" : ""}
              >
                <Tag className="w-4 h-4 mr-2" />
                Coupons
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button 
                variant={isActive('/admin/users') ? "default" : "ghost"}
                className={isActive('/admin/users') ? "bg-brand hover:bg-brand/90" : ""}
              >
                <Users className="w-4 h-4 mr-2" />
                Users
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button 
                variant={isActive('/admin/settings') ? "default" : "ghost"}
                className={isActive('/admin/settings') ? "bg-brand hover:bg-brand/90" : ""}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="py-6">
        {children}
      </main>
    </div>
  );
}
