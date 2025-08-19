'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalKPIs } from '@/components/charts/admin/global-kpis';
import { LifecycleFunnel } from '@/components/charts/admin/lifecycle-funnel';
import { ExceptionMonitoring } from '@/components/charts/admin/exception-monitoring';

interface Metrics {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenueCents: number;
  isMockData?: boolean;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch('/api/control-center/metrics');
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Failed to load metrics data');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">System Dashboard</h1>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Businesses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.totalBusinesses.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Influencers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.totalInfluencers.toLocaleString()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Active Coupons</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.activeCoupons.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform KPIs</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <GlobalKPIs />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Lifecycle</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <LifecycleFunnel />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ExceptionMonitoring />
            </CardContent>
          </Card>
          
          {metrics.isMockData && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              Note: Some data shown is mock data for development purposes.
            </div>
          )}
        </div>
      )}
    </div>
  );
} 