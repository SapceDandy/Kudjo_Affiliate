'use client';

import { useState } from 'react';

export default function TestAdminLogin() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const response = await fetch('/api/control-center/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@kudjo.app',
          passcode: 'kudjo_admin_2024'
        }),
      });

      const data = await response.json();
      
      setResult(`
Status: ${response.status}
Response: ${JSON.stringify(data, null, 2)}
Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}
      `);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Login Test</h1>
      
      <button 
        onClick={testLogin}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Login API'}
      </button>
      
      <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
        {result}
      </pre>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>This will test the login API with:</p>
        <p>Email: admin@kudjo.app</p>
        <p>Passcode: kudjo_admin_2024</p>
      </div>
    </div>
  );
} 