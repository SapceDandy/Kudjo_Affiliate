'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('Attempting admin login with:', { email });
      const response = await fetch('/api/control-center/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, passcode }),
      });
      
      const data = await response.json();
      console.log('Admin login response:', { status: response.status, data });
      
      if (response.ok) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          router.push('/control-center/dashboard');
        }, 500);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold mb-6">System Access</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@kudjo.app"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="passcode">Access Code</Label>
          <Input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter access code"
            autoComplete="current-password"
            required
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
            {success}
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full bg-brand hover:bg-brand/90" 
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Access System'}
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <Button 
          variant="link" 
          type="button"
          onClick={() => router.push('/auth/signin')}
          className="text-sm text-gray-500"
        >
          Back to User Sign In
        </Button>
      </div>
    </div>
  );
} 