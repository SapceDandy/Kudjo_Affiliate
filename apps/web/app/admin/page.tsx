'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="container mx-auto p-6 flex items-center justify-center h-[50vh]">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting to Admin Dashboard...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  );
} 