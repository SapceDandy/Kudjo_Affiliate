'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';

export default function SignInPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'influencer'>('business');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signInWithGoogle, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const role = await signIn(email, password);
      if (role) {
        toast.success('Signed in successfully!');
        router.push(role === 'business' ? '/business' : '/influencer');
      } else {
        setError('Invalid credentials or user not found.');
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async (role: 'business' | 'influencer') => {
    setLoading(true);
    setError('');
    
    try {
      const userRole = await signInWithGoogle(role);
      toast.success('Signed in with Google successfully!');
      router.push(userRole === 'business' ? '/business' : '/influencer');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };


  const handleAdminLogin = () => {
    router.push('/control-center/login');
  };

  return (
    <div className="container mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
      <p className="text-center text-gray-600 mb-6">Sign in to access your dashboard</p>
      
      <Tabs defaultValue="business" className="mb-6" onValueChange={(value) => setActiveTab(value as 'business' | 'influencer')}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="influencer">Influencer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="business">
          <Button 
            className="w-full mb-4 flex items-center justify-center"
            onClick={() => handleGoogleSignIn('business')}
            disabled={loading || authLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google as Business
          </Button>
        </TabsContent>
        
        <TabsContent value="influencer">
          <Button 
            className="w-full mb-4 flex items-center justify-center"
            onClick={() => handleGoogleSignIn('influencer')}
            disabled={loading || authLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google as Influencer
          </Button>
        </TabsContent>
      </Tabs>
      
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">OR CONTINUE WITH</span>
        </div>
      </div>
      
      <form onSubmit={handleEmailSubmit}>
        <div className="mb-4">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <Button type="submit" className="w-full" disabled={loading || authLoading}>
          Sign In as {activeTab === 'business' ? 'Business' : 'Influencer'}
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p>
          Don't have an account? <Link href="/auth/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </p>
        <Button 
          variant="ghost" 
          onClick={handleAdminLogin} 
          className="text-sm text-gray-500 hover:underline mt-2"
        >
          System Access
        </Button>
      </div>
    </div>
  );
}
