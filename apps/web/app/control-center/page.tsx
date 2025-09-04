'use client';

import { useRouter } from 'next/navigation';
// import { useAdminAuth } from '@/lib/hooks/use-admin-auth';
import { ComplianceNotice } from '@/components/legal/compliance-notice';
import { useEffect } from 'react';

export default function ControlCenterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/control-center/dashboard');
  }, [router]);

  return (
    <div className="container mx-auto p-6 flex items-center justify-center h-[50vh]">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting to Control Center Dashboard...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  );
} 