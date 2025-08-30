'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BlockedInfluencers } from '@/components/business/blocked-influencers';
import { PricingTiers } from '@/components/business/pricing-tiers';
import { 
  Building2,
  Plus,
  Search,
  RefreshCw,
  Settings,
} from 'lucide-react';

export default function BusinessDashboard() {
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqSplit, setReqSplit] = useState<number>(20);
  const [reqCap, setReqCap] = useState<number>(5000);

  // Simulate loading user data
  useEffect(() => {
    // In a real app, this would fetch the user's data from an API
    setTimeout(() => {
      // Mock business ID
      setBusinessId('biz_123');
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Business Dashboard</h1>
          <p className="text-gray-600">Manage your campaigns and influencer partnerships</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-brand hover:bg-brand/90">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Welcome Card */}
      <Card className="mb-6 bg-gradient-to-r from-brand/10 to-blue-50 border-brand/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Welcome back!</h2>
              <p className="text-gray-600">
                You have {Math.floor(Math.random() * 5)} active campaigns and {Math.floor(Math.random() * 10)} new redemptions since your last login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Find Influencers Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Influencers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for influencers to partner with..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <Button className="bg-brand hover:bg-brand/90">
              Search
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Food</Button>
            <Button variant="outline" size="sm">Fashion</Button>
            <Button variant="outline" size="sm">Travel</Button>
            <Button variant="outline" size="sm">Fitness</Button>
            <Button variant="outline" size="sm">Beauty</Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pricing Tiers</span>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {businessId && <PricingTiers businessId={businessId} />}
        </CardContent>
      </Card>

      {/* Send Request to Affiliates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Send Request to Affiliates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Request title (e.g., Review our new menu)"
            value={reqTitle}
            onChange={(e) => setReqTitle(e.target.value)}
          />
          <textarea
            className="w-full border rounded px-3 py-2"
            placeholder="Short description and requirements"
            rows={3}
            value={reqDesc}
            onChange={(e) => setReqDesc(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Affiliate payout split (%)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                min={0}
                max={100}
                value={reqSplit}
                onChange={(e) => setReqSplit(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Content meal cap (cents)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                min={0}
                value={reqCap}
                onChange={(e) => setReqCap(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="pt-2">
            <Button
              onClick={async () => {
                if (!businessId) { alert('Business ID not loaded yet'); return; }
                if (!reqTitle.trim()) { alert('Title is required'); return; }
                const res = await fetch('/api/requests/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ bizId: businessId, title: reqTitle, description: reqDesc, splitPct: reqSplit, contentMealCapCents: reqCap })
                });
                if (res.ok) {
                  setReqTitle(''); setReqDesc(''); setReqSplit(20); setReqCap(5000);
                  alert('Request sent to affiliates');
                } else {
                  const j = await res.json().catch(()=>({ error: 'Failed' }));
                  alert(j.error || 'Failed to create request');
                }
              }}
            >
              Send Request
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Influencers */}
      {businessId && <BlockedInfluencers businessId={businessId} />}
    </div>
  );
} 