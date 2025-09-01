"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Percent, Users, Clock, Store, MapPin } from 'lucide-react';
import { useDemoAuth } from '@/lib/demo-auth';
import { db } from '@/lib/firebase';
import { useBusinessMetrics } from '@/lib/hooks/use-business-metrics';
import { useBusinessOffers } from '@/lib/hooks/use-business-offers';
import { useBusinessRequests } from '@/lib/hooks/use-business-requests';
import { useBusinessPrograms } from '@/lib/hooks/use-business-programs';
import { SearchFilter } from '@/components/search-filter';
import { useSearchFilter } from '@/lib/hooks/use-search-filter';
import { FindInfluencersDialog } from '@/components/find-influencers-dialog';
import { doc, setDoc, updateDoc, deleteDoc, collection, getDocs, getDoc, orderBy as fsOrderBy, query as fsQuery, startAt, endAt, limit as fsLimit } from 'firebase/firestore';
import toast from 'react-hot-toast';

type DiscountType = 'percentage' | 'dollar' | 'bogo' | 'student' | 'happy_hour' | 'free_appetizer' | 'first_time';

interface Offer {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'expired';
  splitPct: number;
  discountType: DiscountType;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
}

interface RequestItem {
  id: string;
  influencer: string;
  followers: number;
  tier?: string;
  proposedSplitPct: number;
  discountType: DiscountType;
  userDiscountPct?: number;
  userDiscountCents?: number;
  minSpendCents?: number;
  createdAt: Date;
  status: 'pending' | 'countered' | 'approved' | 'declined';
}

interface ProgramItem {
  id: string;
  influencer: string;
  offerTitle: string;
  redemptions: number;
  payoutCents: number;
  since: Date;
}


export default function BusinessHome() {
  const { user } = useDemoAuth();
  const { metrics, loading: metricsLoading } = useBusinessMetrics();
  const { offers: realOffers, loading: offersLoading, error: offersError, createOffer, refetch: refetchOffers } = useBusinessOffers();
  const { requests: realRequests, loading: requestsLoading, error: requestsError, updateRequest, refetch: refetchRequests } = useBusinessRequests();
  const { programs: realPrograms, loading: programsLoading, error: programsError, processPayout, refetch: refetchPrograms } = useBusinessPrograms();

  // Search and filter functionality
  const {
    filteredData: filteredOffers,
    setSearchQuery: setOffersSearch,
    setFilters: setOffersFilters
  } = useSearchFilter({
    data: realOffers || [],
    searchFields: ['title', 'description'],
    filterFields: {
      status: 'status',
      discountType: 'discountType'
    }
  });

  const {
    filteredData: filteredRequests,
    setSearchQuery: setRequestsSearch,
    setFilters: setRequestsFilters
  } = useSearchFilter({
    data: realRequests || [],
    searchFields: ['influencer', 'tier'],
    filterFields: {
      status: 'status',
      tier: 'tier'
    }
  });

  const {
    filteredData: filteredPrograms,
    setSearchQuery: setProgramsSearch,
    setFilters: setProgramsFilters
  } = useSearchFilter({
    data: realPrograms || [],
    searchFields: ['influencer', 'offerTitle'],
    filterFields: {}
  });
  const [counterReqId, setCounterReqId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [perfOfferId, setPerfOfferId] = useState<string | null>(null);
  const [detailsProgramId, setDetailsProgramId] = useState<string | null>(null);
  const [messageProgramId, setMessageProgramId] = useState<string | null>(null);
  const [tierSettings, setTierSettings] = useState<any>(null);
  const [selectedForPayout, setSelectedForPayout] = useState<Record<string, boolean>>({});

  const totalPayoutCents = metrics?.totalPayoutOwed || 0;
  const totalRedemptions = metrics?.totalRedemptions || 0;
  const activeOffers = metrics?.activeOffers || 0;

  const formatMoney = (cents?: number) => typeof cents === 'number' ? `$${(cents/100).toFixed(2)}` : '$0.00';
  const timeAgo = (d: Date) => {
    const days = Math.floor((Date.now() - d.getTime()) / (1000*60*60*24));
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(db, 'businesses', user.uid));
        const data = snap.exists() ? snap.data() : undefined;
        if (!cancelled && data && (data as any).couponSettings) {
          setTierSettings((data as any).couponSettings as TierSettings);
        }
      } catch {}
    };
    run();
    return () => { cancelled = true; };
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      {/* Header + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Store className="w-5 h-5" /> Business Dashboard</h1>
          <p className="text-muted-foreground">Manage offers, influencer requests, and programs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFindDialogOpen(true)}>Find Influencers</Button>
          <Button variant="outline" onClick={() => setTierDialogOpen(true)}>Tier Defaults</Button>
          <Button onClick={() => setCreateDialogOpen(true)}>Create Offer</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payout Owed</p>
                <p className="text-xl font-bold text-green-600">{formatMoney(totalPayoutCents)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Redemptions</p>
                <p className="text-xl font-bold text-blue-600">{totalRedemptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Offers</p>
                <p className="text-xl font-bold text-purple-600">{activeOffers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-xl font-bold text-orange-600">{realRequests.filter((r: any) => r.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Offers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Offers</h2>
        </div>
        
        <SearchFilter
          onSearch={setOffersSearch}
          onFilter={setOffersFilters}
          placeholder="Search offers..."
          filterOptions={{
            status: ['active', 'paused', 'expired'],
            discountType: ['percentage', 'dollar', 'bogo', 'student', 'happy_hour', 'free_appetizer', 'first_time']
          }}
        />
        
        {offersLoading ? (
          <div className="text-center py-8">Loading offers...</div>
        ) : filteredOffers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No offers found.</p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              Create Your First Offer
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOffers.map((o: any) => (
            <Card key={o.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{o.title}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-600" /> Austin, TX
                    </p>
                  </div>
                  <Badge variant={o.status === 'active' ? 'default' : 'outline'}>{o.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Influencer Split</p>
                    <p className="font-semibold text-green-600">{o.splitPct}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer Discount</p>
                    <p className="font-semibold text-blue-600">
                      {o.discountType === 'percentage' && `${o.userDiscountPct}% off`}
                      {o.discountType === 'dollar' && `${formatMoney(o.userDiscountCents)} off`}
                      {o.discountType === 'bogo' && 'BOGO'}
                      {o.discountType === 'student' && 'Student'}
                      {o.discountType === 'happy_hour' && 'Happy Hour'}
                      {o.discountType === 'free_appetizer' && 'Free Appetizer'}
                      {o.discountType === 'first_time' && 'First-Time Customer'}
                    </p>
                    {o.minSpendCents ? (
                      <p className="text-xs text-muted-foreground">Min spend {formatMoney(o.minSpendCents)}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      const nextStatus = o.status === 'active' ? 'paused' : 'active';
                      try {
                        await updateDoc(doc(db, 'offers', o.id), { 
                          active: nextStatus === 'active',
                          status: nextStatus,
                          updatedAt: new Date()
                        });
                        toast.success(`Offer ${nextStatus === 'active' ? 'resumed' : 'paused'}`);
                        refetchOffers();
                      } catch (error) {
                        console.error('Error updating offer:', error);
                        toast.error('Failed to update offer');
                      }
                    }}
                  >
                    {o.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPerfOfferId(o.id)}>View Performance</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>

      {/* Influencer Requests */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Influencer Requests ({filteredRequests.length})</h2>
        
        <SearchFilter
          onSearch={setRequestsSearch}
          onFilter={setRequestsFilters}
          placeholder="Search requests..."
          filterOptions={{
            status: ['pending', 'countered', 'approved', 'declined'],
            tier: ['S', 'M', 'L', 'XL', 'Huge'],
            dateRange: true
          }}
        />
        
        {requestsLoading ? (
          <div className="text-center py-8">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No requests found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((r: any) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{r.influencer}</CardTitle>
                    <p className="text-sm text-muted-foreground">{r.followers.toLocaleString()} followers • {timeAgo(r.createdAt)}</p>
                  </div>
                  <Badge variant={r.status === 'pending' ? 'outline' : 'secondary'}>
                    {r.status === 'countered' ? 'Response' : r.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Proposed Split</p>
                    <p className="font-semibold text-green-600">{r.proposedSplitPct}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer Discount</p>
                    <p className="font-semibold text-blue-600">
                      {r.discountType === 'percentage' && `${r.userDiscountPct}% off`}
                      {r.discountType === 'dollar' && `${formatMoney(r.userDiscountCents)} off`}
                      {r.discountType === 'bogo' && 'BOGO'}
                      {r.discountType === 'student' && 'Student'}
                      {r.discountType === 'happy_hour' && 'Happy Hour'}
                      {r.discountType === 'free_appetizer' && 'Free Appetizer'}
                      {r.discountType === 'first_time' && 'First-Time Customer'}
                    </p>
                    {r.minSpendCents ? (
                      <p className="text-xs text-muted-foreground">Min spend {formatMoney(r.minSpendCents)}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.status === 'pending' ? (
                    <>
                      <Button 
                        className="flex-1"
                        onClick={async () => {
                          try {
                            await updateRequest(r.id, 'approved');
                            toast.success('Request approved!');
                            refetchRequests();
                          } catch (error) {
                            toast.error('Failed to approve request');
                          }
                        }}
                      >
                        Approve
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => setCounterReqId(r.id)}>Counter</Button>
                      <Button 
                        className="flex-1" 
                        variant="outline" 
                        onClick={async () => {
                          try {
                            await updateRequest(r.id, 'declined');
                            toast.success('Request declined');
                            refetchRequests();
                          } catch (error) {
                            toast.error('Failed to decline request');
                          }
                        }}
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button className="flex-1" variant="outline" disabled>Awaiting Response</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>

      {/* Active Programs */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Active Programs</h2>
        
        <SearchFilter
          onSearch={setProgramsSearch}
          onFilter={setProgramsFilters}
          placeholder="Search programs..."
          filterOptions={{
            dateRange: true
          }}
        />
        
        {programsLoading ? (
          <div className="text-center py-8">Loading programs...</div>
        ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active programs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{p.influencer}</CardTitle>
                    <p className="text-sm text-muted-foreground">{p.offerTitle}</p>
                  </div>
                  <Badge>Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-muted-foreground">Redemptions</p>
                    <p className="font-semibold text-blue-600">{p.redemptions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payout Owed</p>
                    <p className="font-semibold text-green-600">{formatMoney(p.payoutCents)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Since</p>
                    <p className="font-semibold">{p.since.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMessageProgramId(p.id)}>Message</Button>
                  <Button variant="outline" size="sm" onClick={() => setDetailsProgramId(p.id)}>View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>

      {/* Payouts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Payouts</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                // Export selected to CSV
                const entries = Object.entries(selectedForPayout).filter(([k,v]) => v);
                const selectedInfluencers = new Set(entries.map(([id]) => id));
                const rows: Array<{ influencer: string; amount: number }> = [];
                const map: Record<string, number> = {};
                realPrograms.forEach((p: any) => {
                  if (selectedInfluencers.has(p.influencer)) {
                    map[p.influencer] = (map[p.influencer] || 0) + p.payoutCents;
                  }
                });
                Object.keys(map).forEach(inf => rows.push({ influencer: inf, amount: map[inf] }));
                const csv = ['influencer,amount_cents'].concat(rows.map(r => `${r.influencer},${r.amount}`)).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'payouts.csv';
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Export CSV
            </Button>
            <Button 
              onClick={async () => {
                const entries = Object.entries(selectedForPayout).filter(([k,v]) => v);
                if (entries.length === 0) return;
                const selectedInfluencers = new Set(entries.map(([id]) => id));
                // Aggregate amounts
                const map: Record<string, { amount: number; programIds: string[] }> = {};
                selectedInfluencers.forEach(inf => {
                  realPrograms.filter((p: any) => p.influencer === inf).forEach((p: any) => {
                    if (!map[p.influencer]) map[p.influencer] = { amount: 0, programIds: [] };
                    map[p.influencer].amount += p.payoutCents;
                    map[p.influencer].programIds.push(p.id);
                  });
                });
                // Write payouts and zero out local program payouts
                const ts = Date.now();
                await Promise.all(Object.keys(map).map(async inf => {
                  const recId = `pay_${ts}_${inf}`;
                  try {
                    await setDoc(doc(db, 'payouts', recId), { id: recId, businessId: user?.uid || 'unknown', influencer: inf, amountCents: map[inf].amount, programIds: map[inf].programIds, createdAt: ts, status: 'paid' });
                  } catch {}
                }));
                await processPayout(Array.from(selectedInfluencers).flatMap(inf => realPrograms.filter((p: any) => p.influencer === inf).map((p: any) => p.id)));
                setSelectedForPayout({});
              }}
            >
              Mark as Paid
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(new Set(realPrograms.map((p: any) => p.influencer))).map((inf: string) => {
            const selectedPrograms = realPrograms.filter((p: any) => selectedForPayout[p.influencer]);
            const totalSelectedRedemptions = realPrograms.filter((p: any) => selectedForPayout[p.influencer]).reduce((sum: number, p: any) => sum + p.redemptions, 0);
            const amount = selectedPrograms.reduce((sum: number, p: any) => sum + p.payoutCents, 0);
            return (
              <Card key={inf}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{inf}</p>
                    <p className="text-sm text-muted-foreground">Owed: {formatMoney(amount)}</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedForPayout[inf] || false}
                    onChange={(e) => setSelectedForPayout(prev => ({ ...prev, [inf]: e.target.checked }))}
                    className="w-4 h-4"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Counter Offer Dialog */}
      {counterReqId && (
        <CounterOfferDialog 
          open={true} 
          onClose={() => setCounterReqId(null)} 
          onCounter={async (payload) => {
            await updateRequest(counterReqId, 'countered', payload);
            toast.success('Counter offer sent!');
            setCounterReqId(null);
            refetchRequests();
          }}
        />
      )}

      {/* Create Offer Dialog */}
      {createDialogOpen && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Offer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  placeholder="Enter offer title"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const title = (e.target as HTMLInputElement).value;
                      if (title.trim()) {
                        createOffer({
                          businessId: 'demo_business_user',
                          title,
                          discountType: 'percentage',
                          splitPct: 20,
                          userDiscountPct: 10
                        }).then(() => {
                          toast.success('Offer created successfully!');
                          setCreateDialogOpen(false);
                          refetchOffers();
                        }).catch(() => {
                          toast.error('Failed to create offer');
                        });
                      }
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                    const title = input?.value;
                    if (title?.trim()) {
                      createOffer({
                        businessId: 'demo_business_user',
                        title,
                        discountType: 'percentage',
                        splitPct: 20,
                        userDiscountPct: 10
                      }).then(() => {
                        toast.success('Offer created successfully!');
                        setCreateDialogOpen(false);
                        refetchOffers();
                      }).catch(() => {
                        toast.error('Failed to create offer');
                      });
                    }
                  }}
                  className="flex-1"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {findDialogOpen && (
        <FindInfluencersDialog 
          open={findDialogOpen} 
          onClose={() => setFindDialogOpen(false)}
          onSendRequest={async (req) => {
            try {
              const requestId = `req_${Date.now()}_${req.influencerId || 'unknown'}`;
              await setDoc(doc(db, 'influencerRequests', requestId), {
                id: requestId,
                businessId: user?.uid || 'demo_business_user',
                influencer: req.influencer,
                followers: req.followers,
                tier: req.tier,
                proposedSplitPct: req.proposedSplitPct,
                discountType: req.discountType,
                userDiscountPct: req.userDiscountPct,
                userDiscountCents: req.userDiscountCents,
                minSpendCents: req.minSpendCents,
                createdAt: new Date(),
                status: 'pending'
              });
              refetchRequests();
            } catch (error) {
              console.error('Error sending request:', error);
              throw error;
            }
          }}
        />
      )}

      {tierDialogOpen && (
        <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tier Defaults</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Configure default split percentages and minimum requirements for each influencer tier.
              </p>
              
              <div className="grid gap-4">
                {[
                  { tier: 'S', name: 'Silver', followers: '1K-10K', defaultSplit: 15 },
                  { tier: 'M', name: 'Gold', followers: '10K-50K', defaultSplit: 20 },
                  { tier: 'L', name: 'Platinum', followers: '50K-100K', defaultSplit: 25 },
                  { tier: 'XL', name: 'Diamond', followers: '100K-500K', defaultSplit: 30 },
                  { tier: 'Huge', name: 'Celebrity', followers: '500K+', defaultSplit: 35 }
                ].map((tierInfo) => (
                  <div key={tierInfo.tier} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tierInfo.name} ({tierInfo.tier})</h4>
                      <p className="text-sm text-muted-foreground">{tierInfo.followers} followers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Default Split:</span>
                      <input 
                        type="number" 
                        defaultValue={tierInfo.defaultSplit}
                        className="w-16 px-2 py-1 border rounded text-center"
                        min="5"
                        max="50"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    toast.success('Tier defaults updated successfully!');
                    setTierDialogOpen(false);
                  }} 
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button onClick={() => setTierDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {perfOfferId && (
        <PerformanceDialog offerId={perfOfferId} open={true} onClose={() => setPerfOfferId(null)} />
      )}
      {detailsProgramId && (
        <ProgramDetailsDialog programId={detailsProgramId} open={true} onClose={() => setDetailsProgramId(null)} />
      )}
      {messageProgramId && (
        <MessageDialog programId={messageProgramId} open={true} onClose={() => setMessageProgramId(null)} onSend={async (msg) => {
          try { await setDoc(doc(db, 'messages', `msg_${Date.now()}`), { programId: messageProgramId, bizId: user?.uid || 'unknown', message: msg, createdAt: Date.now() }); } catch {}
        }} />
      )}
    </div>
  );
}

function CounterOfferDialog({ open, onClose, onCounter }: { open: boolean; onClose: () => void; onCounter: (payload: { splitPct: number; discountType: DiscountType; userDiscountPct?: number; userDiscountCents?: number; minSpendCents?: number; }) => void }) {
  const [splitPct, setSplitPct] = useState(25);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [userDiscountPct, setUserDiscountPct] = useState(20);
  const [userDiscountCents, setUserDiscountCents] = useState(500);
  const [minSpendCents, setMinSpendCents] = useState(0);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Counter Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sent && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">Counter offer sent.</div>
          )}
          <div>
            <label className="text-sm font-medium">Influencer Split (%)</label>
            <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={splitPct} min={10} max={60} onChange={(e) => setSplitPct(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Discount Type</label>
            <select className="w-full mt-1 px-3 py-2 border rounded-md" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
              <option value="percentage">Percentage Off</option>
              <option value="dollar">Dollar Off</option>
              <option value="bogo">Buy One Get One Free</option>
              <option value="student">Student Discount</option>
              <option value="happy_hour">Happy Hour</option>
              <option value="free_appetizer">Free Appetizer</option>
              <option value="first_time">First-Time Customer</option>
            </select>
          </div>
          {discountType === 'percentage' && (
            <div>
              <label className="text-sm font-medium">Customer Discount (%)</label>
              <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={userDiscountPct} min={5} max={60} onChange={(e) => setUserDiscountPct(Number(e.target.value))} />
            </div>
          )}
          {discountType === 'dollar' && (
            <div>
              <label className="text-sm font-medium">Dollar Amount Off ($)</label>
              <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={userDiscountCents/100} min={1} step={0.01} onChange={(e) => setUserDiscountCents(Number(e.target.value)*100)} />
            </div>
          )}
          {(discountType === 'dollar' || discountType === 'free_appetizer') && (
            <div>
              <label className="text-sm font-medium">Minimum Spend ($)</label>
              <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={minSpendCents/100} min={0} step={0.01} onChange={(e) => setMinSpendCents(Number(e.target.value)*100)} />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea className="w-full mt-1 px-3 py-2 border rounded-md" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explain your terms..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => { onCounter({ splitPct, discountType, userDiscountPct, userDiscountCents, minSpendCents }); setSent(true); }}>Send Counter</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateOfferDialog({ open, onClose, onCreate, defaultSettings }: { open: boolean; onClose: () => void; onCreate: (offer: Omit<Offer, 'id' | 'status'> & { status?: Offer['status'] }) => void; defaultSettings?: { splitPct: number; discountType: DiscountType; userDiscountPct?: number; userDiscountCents?: number; minSpendCents?: number } }) {
  const [title, setTitle] = useState('');
  const [splitPct, setSplitPct] = useState(defaultSettings?.splitPct ?? 20);
  const [discountType, setDiscountType] = useState<DiscountType>(defaultSettings?.discountType ?? 'percentage');
  const [userDiscountPct, setUserDiscountPct] = useState(defaultSettings?.userDiscountPct ?? 20);
  const [userDiscountCents, setUserDiscountCents] = useState(defaultSettings?.userDiscountCents ?? 500);
  const [minSpendCents, setMinSpendCents] = useState(defaultSettings?.minSpendCents ?? 0);
  const [created, setCreated] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {created && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">Offer created.</div>
          )}
          <div>
            <label className="text-sm font-medium">Title</label>
            <input className="w-full mt-1 px-3 py-2 border rounded-md" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20% Off Lunch" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Influencer Split (%)</label>
              <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={splitPct} min={10} max={60} onChange={(e) => setSplitPct(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Discount Type</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                <option value="percentage">Percentage Off</option>
                <option value="dollar">Dollar Off</option>
                <option value="bogo">Buy One Get One Free</option>
                <option value="student">Student Discount</option>
                <option value="happy_hour">Happy Hour</option>
                <option value="free_appetizer">Free Appetizer</option>
                <option value="first_time">First-Time Customer</option>
              </select>
            </div>
          </div>
          {discountType === 'percentage' && (
            <div>
              <label className="text-sm font-medium">Customer Discount (%)</label>
              <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={userDiscountPct} min={5} max={60} onChange={(e) => setUserDiscountPct(Number(e.target.value))} />
            </div>
          )}
          {discountType === 'dollar' && (
            <div>
              <label className="text-sm font-medium">Dollar Amount Off ($)</label>
              <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={userDiscountCents/100} min={1} step={0.01} onChange={(e) => setUserDiscountCents(Number(e.target.value)*100)} />
            </div>
          )}
          {(discountType === 'dollar' || discountType === 'free_appetizer') && (
            <div>
              <label className="text-sm font-medium">Minimum Spend ($)</label>
              <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={minSpendCents/100} min={0} step={0.01} onChange={(e) => setMinSpendCents(Number(e.target.value)*100)} />
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => { 
              onCreate({ title, splitPct, discountType, userDiscountPct, userDiscountCents, minSpendCents, status: 'active' });
              setCreated(true);
            }}>Create Offer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function PerformanceDialog({ offerId, open, onClose }: { offerId: string; open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ views: number; redemptions: number; payoutCents: number; series: Array<{ day: number; views: number; redemptions: number }> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/offer?id=${encodeURIComponent(offerId)}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [offerId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Offer Performance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : data ? (
            <>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{data.views}</p>
                  <p className="text-sm text-muted-foreground">Views</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{data.redemptions}</p>
                  <p className="text-sm text-muted-foreground">Redemptions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">${(data.payoutCents/100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Payout</p>
                </div>
              </div>
              <div className="bg-gray-50 border rounded p-4">
                <p className="text-sm text-muted-foreground">Engagement over time</p>
                <div className="h-40 grid grid-cols-7 gap-2 items-end">
                  {data.series.map((pt, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="bg-blue-500 w-4" style={{ height: `${pt.views * 2}px` }} />
                      <div className="bg-green-500 w-4" style={{ height: `${pt.redemptions * 6}px` }} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgramDetailsDialog({ programId, open, onClose }: { programId: string; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Program Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Program ID</p>
              <p className="font-semibold">{programId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-semibold">Event / Happy Hour</p>
            </div>
            <div>
              <p className="text-muted-foreground">Split</p>
              <p className="font-semibold">25%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Discount</p>
              <p className="font-semibold">20% off</p>
            </div>
          </div>
          <div className="bg-gray-50 border rounded p-3">
            <p className="text-muted-foreground">Tasks</p>
            <ul className="list-disc list-inside">
              <li>Create content by 5 days</li>
              <li>Keep post live for 23 days</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageDialog({ programId, open, onClose, onSend }: { programId: string; open: boolean; onClose: () => void; onSend: (msg: string) => void }) {
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message Influencer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {sent && <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">Message sent.</div>}
          <textarea className="w-full px-3 py-2 border rounded-md" rows={4} placeholder="Write a message..." value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            <Button className="flex-1" onClick={() => { onSend(msg); setSent(true); }}>Send</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type TierKey = 'default' | 'Small' | 'Medium' | 'Large' | 'Extra Large';
type TierSettings = Record<TierKey, { splitPct: number; discountType: DiscountType; userDiscountPct?: number; userDiscountCents?: number; minSpendCents?: number } | undefined>;

function TierDefaultsDialog({ open, onClose, onSave, bizId }: { open: boolean; onClose: () => void; onSave: (settings: TierSettings) => void; bizId: string }) {
  const tiers: TierKey[] = ['default', 'Small', 'Medium', 'Large', 'Extra Large'];
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TierSettings>({
    default: { splitPct: 20, discountType: 'percentage', userDiscountPct: 20 },
    Small: undefined,
    Medium: undefined,
    Large: undefined,
    'Extra Large': undefined,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'businesses', bizId));
        const data = snap.exists() ? snap.data() : undefined;
        if (data && (data as any).couponSettings) {
          const incoming = (data as any).couponSettings as TierSettings;
          if (!cancelled) setSettings(prev => ({ ...prev, ...incoming }));
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [bizId]);

  const updateTierField = (tier: TierKey, field: keyof NonNullable<TierSettings[TierKey]>, value: any) => {
    setSettings(prev => {
      const curr = prev[tier] ?? { splitPct: 20, discountType: 'percentage' };
      return { ...prev, [tier]: { ...curr, [field]: value } };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tier Defaults</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {saved && <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">Saved.</div>}
          <p className="text-sm text-muted-foreground">Set defaults per tier. Default is required; other tiers override when influencer tier is known.</p>
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading settings…</div>
          ) : (
            <div className="space-y-4">
              {tiers.map(tier => (
                <Card key={tier}>
                  <CardHeader>
                    <CardTitle className="text-base">{tier === 'default' ? 'Default' : `${tier} Tier`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium">Split (%)</label>
                        <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={settings[tier]?.splitPct ?? ''} onChange={(e) => updateTierField(tier, 'splitPct', Number(e.target.value) || 0)} min={10} max={60} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Discount Type</label>
                        <select className="w-full mt-1 px-3 py-2 border rounded-md" value={settings[tier]?.discountType ?? 'percentage'} onChange={(e) => updateTierField(tier, 'discountType', e.target.value as DiscountType)}>
                          <option value="percentage">Percentage Off</option>
                          <option value="dollar">Dollar Off</option>
                          <option value="bogo">BOGO</option>
                          <option value="student">Student</option>
                          <option value="happy_hour">Happy Hour</option>
                          <option value="free_appetizer">Free Appetizer</option>
                          <option value="first_time">First-Time Customer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Customer %</label>
                        <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={settings[tier]?.userDiscountPct ?? ''} onChange={(e) => updateTierField(tier, 'userDiscountPct', Number(e.target.value) || 0)} min={0} max={90} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">$ Off (cents)</label>
                        <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={settings[tier]?.userDiscountCents ?? ''} onChange={(e) => updateTierField(tier, 'userDiscountCents', Number(e.target.value) || 0)} min={0} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Min Spend (cents)</label>
                        <input type="number" className="w-full mt-1 px-3 py-2 border rounded-md" value={settings[tier]?.minSpendCents ?? ''} onChange={(e) => updateTierField(tier, 'minSpendCents', Number(e.target.value) || 0)} min={0} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            <Button className="flex-1" onClick={() => { onSave(settings); setSaved(true); }}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}