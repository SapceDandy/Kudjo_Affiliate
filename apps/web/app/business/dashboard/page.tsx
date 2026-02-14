'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BlockedInfluencers } from '@/components/business/blocked-influencers';
// import { PricingTiers } from '@/components/business/pricing-tiers';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Settings,
  Lightbulb,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DealSuggestion {
  title: string;
  splitPct: number;
  targetTiers: string[];
  estimatedRoas: number;
  confidence: number;
  reasoning?: string;
}

export default function BusinessDashboard() {
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqSplit, setReqSplit] = useState<number>(20);
  const [reqCap, setReqCap] = useState<number>(5000);
  const [recommendations, setRecommendations] = useState<DealSuggestion[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // Simulate loading user data
  useEffect(() => {
    // In a real app, this would fetch the user's data from an API
    setTimeout(() => {
      // Mock business ID
      setBusinessId('biz_123');
      setLoading(false);
    }, 500);
  }, []);

  // Fetch AI recommendations when businessId is available
  useEffect(() => {
    if (!businessId) return;
    setRecsLoading(true);
    fetch(`/api/business/recommendations?bizId=${businessId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.suggestions) setRecommendations(data.suggestions);
      })
      .catch(() => {})
      .finally(() => setRecsLoading(false));
  }, [businessId]);

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

      {/* AI Deal Recommendations */}
      <Card className="mb-6 border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            AI Deal Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recsLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your business data...
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <div key={i} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {rec.estimatedRoas}x ROAS
                      </Badge>
                      <Badge variant="secondary">{rec.confidence}% confidence</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rec.reasoning}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {rec.targetTiers.map(tier => (
                        <Badge key={tier} variant="outline" className="text-xs">{tier}</Badge>
                      ))}
                      <span className="text-sm text-gray-500 ml-2">{rec.splitPct}% split</span>
                    </div>
                    <Button size="sm" className="bg-brand hover:bg-brand/90">
                      Create This Deal
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recommendations available yet. Create your first campaign to get AI-powered suggestions.</p>
          )}
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
          <div className="p-4 text-center text-muted-foreground">
            Pricing Tiers component temporarily disabled
          </div>
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