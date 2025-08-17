'use client';

import { useAuth } from '@/lib/auth';

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user?.email}</h2>
        <p className="text-gray-600">
          You have full administrative access to the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Businesses</h3>
          <p className="text-sm text-gray-600">Manage business accounts and settings</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Influencers</h3>
          <p className="text-sm text-gray-600">Monitor influencer activities and metrics</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Analytics</h3>
          <p className="text-sm text-gray-600">View platform performance and statistics</p>
        </div>
      </div>
    </div>
  );
} 