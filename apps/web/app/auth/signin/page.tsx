'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'influencer'>('business');
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signIn(email, password);
      
      // Redirect based on role
      if (activeTab === 'business') {
        router.replace('/business');
      } else {
        router.replace('/influencer');
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (role: 'business' | 'influencer') => {
    setLoading(true);
    setError('');
    
    try {
      await signInWithGoogle(role);
      
      // Get the current user to check their actual role
      // This handles cases where a user might already exist with a different role
      const currentUser = useAuth().user;
      
      // Redirect based on the user's actual role, not the selected role
      if (currentUser?.role === 'business') {
        router.replace('/business');
      } else if (currentUser?.role === 'influencer') {
        router.replace('/influencer');
      } else {
        // Fallback to the selected role if for some reason the user role is not set
        if (role === 'business') {
          router.replace('/business');
        } else {
          router.replace('/influencer');
        }
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      
      // Provide more specific error messages
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked. Please allow pop-ups and try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google sign-in.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Please contact support.');
      } else {
        setError(`Google sign-in failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    router.push('/control-center/login');
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card className="border-brand/20">
        <CardHeader>
          <CardTitle className="text-brand">Sign In</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
          
          <Tabs 
            defaultValue="business" 
            className="mt-4"
            onValueChange={(value) => setActiveTab(value as 'business' | 'influencer')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="influencer">Influencer</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Google Sign In */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-brand/20 hover:bg-brand/5"
              onClick={() => handleGoogleSignIn(activeTab)}
              disabled={loading}
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
              Continue with Google as {activeTab === 'business' ? 'Business' : 'Influencer'}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-brand/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                required
                disabled={loading}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-brand/20 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                required
                disabled={loading}
                placeholder="Enter your password"
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
              {loading ? 'Signing In...' : `Sign In as ${activeTab === 'business' ? 'Business' : 'Influencer'}`}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleAdminLogin}
            className="text-sm text-brand hover:text-brand/80 hover:bg-brand/5"
          >
            Admin? Sign in here
          </Button>
          
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-brand hover:text-brand/80">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
