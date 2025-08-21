'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function FirebaseDebugPage() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [testResult, setTestResult] = useState<string>('');
  const [redirectTest, setRedirectTest] = useState<string>('');

  const testBusinessSignIn = async () => {
    setTestResult('Testing business sign-in...');
    try {
      const role = await signInWithGoogle('business', { debug: true });
      setTestResult(`Sign-in successful with role: ${role}`);
      setRedirectTest(`Should redirect to: /${role}`);
      
      // Wait 1 second to show result before redirecting
      setTimeout(() => {
        router.push(`/${role}`);
      }, 1000);
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testInfluencerSignIn = async () => {
    setTestResult('Testing influencer sign-in...');
    try {
      const role = await signInWithGoogle('influencer', { debug: true });
      setTestResult(`Sign-in successful with role: ${role}`);
      setRedirectTest(`Should redirect to: /${role}`);
      
      // Wait 1 second to show result before redirecting
      setTimeout(() => {
        router.push(`/${role}`);
      }, 1000);
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => {
    if (user) {
      setTestResult(`Already signed in as: ${user.role}`);
    } else {
      setTestResult('Not signed in');
    }
  }, [user]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      <Card className="p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Current Status</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {user ? JSON.stringify(user, null, 2) : 'Not signed in'}
        </pre>
      </Card>
      
      <Card className="p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Test Results</h2>
        <div className="bg-gray-100 p-2 rounded mb-2">{testResult}</div>
        {redirectTest && <div className="bg-blue-100 p-2 rounded">{redirectTest}</div>}
      </Card>
      
      <div className="flex flex-col space-y-2">
        <Button onClick={testBusinessSignIn} className="bg-blue-500 hover:bg-blue-600">
          Test Business Sign-In
        </Button>
        <Button onClick={testInfluencerSignIn} className="bg-green-500 hover:bg-green-600">
          Test Influencer Sign-In
        </Button>
        {user && (
          <Button onClick={() => signOut()} className="bg-red-500 hover:bg-red-600">
            Sign Out
          </Button>
        )}
        <Button onClick={() => router.push('/auth/signin')} variant="outline">
          Go to Regular Sign-In Page
        </Button>
      </div>
    </div>
  );
} 