'use client';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TestAuthPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Test</h1>
      
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          {user ? (
            <div>
              <p><strong>Signed In:</strong> Yes</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>UID:</strong> {user.uid}</p>
              <Button onClick={signOut} className="mt-4">Sign Out</Button>
            </div>
          ) : (
            <div>
              <p><strong>Signed In:</strong> No</p>
              <Link href="/auth/signin">
                <Button className="mt-4">Go to Sign In</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Links</h2>
          <div className="space-y-2">
            <Link href="/auth/signin">
              <Button variant="outline" className="w-full">Test User Sign In</Button>
            </Link>
            <Link href="/admin/login">
              <Button variant="outline" className="w-full">Test Admin Login</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" className="w-full">Test Admin Dashboard (Protected)</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 