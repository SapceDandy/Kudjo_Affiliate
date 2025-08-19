'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, passcode }),
      });

      if (response.ok) {
        router.replace(next);
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="border-brand/20 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-brand">Admin Login</CardTitle>
          <CardDescription>Sign in to access admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                required
                disabled={loading}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full p-3 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                required
                disabled={loading}
                placeholder="Enter admin passcode"
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-brand hover:bg-brand/90 text-white" 
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div />}>
      <AdminLoginForm />
    </Suspense>
  );
}
