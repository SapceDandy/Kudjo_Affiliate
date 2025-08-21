'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDebugPage() {
  const [email, setEmail] = useState('devon@getkudjo.com');
  const [passcode, setPasscode] = useState('1234567890!Dd');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      setStatus('Attempting admin login...');
      setError(null);
      setResponse(null);

      const res = await fetch('/api/control-center/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, passcode }),
      });

      const data = await res.json();
      setResponse(data);

      if (res.ok) {
        setStatus('Login successful!');
        
        // Check session
        setTimeout(async () => {
          try {
            const sessionRes = await fetch('/api/control-center/session');
            const sessionData = await sessionRes.json();
            setResponse((prev: any) => ({ ...prev, sessionCheck: sessionData }));
            
            if (sessionData.isAdmin) {
              setStatus('Session verified! Redirecting to dashboard...');
              setTimeout(() => {
                router.push('/control-center/dashboard');
              }, 1500);
            } else {
              setError('Session check failed - not recognized as admin');
            }
          } catch (err) {
            setError('Error checking session: ' + (err instanceof Error ? err.message : 'Unknown error'));
          }
        }, 1000);
      } else {
        setStatus('Login failed');
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('Error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Admin Login Debug</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Passcode</label>
          <input
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Test Admin Login
        </button>
      </div>
      
      {status && (
        <div className={`p-4 rounded mb-4 ${
          status.includes('successful') || status.includes('verified') 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : status === 'Error' || status.includes('failed') 
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          <p>{status}</p>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      )}
      
      {response && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Response</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm">
        <h2 className="font-semibold mb-2">Debugging Tips</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Check that environment variables are set correctly</li>
          <li>Ensure cookies are not being blocked by browser settings</li>
          <li>Verify that the middleware is correctly validating JWT tokens</li>
          <li>Check for CORS issues if testing from a different domain</li>
        </ul>
      </div>
    </div>
  );
} 