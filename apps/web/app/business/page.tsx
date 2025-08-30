"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Percent, Users, Clock, Store, MapPin } from 'lucide-react';

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
  const [counterReqId, setCounterReqId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [findDialogOpen, setFindDialogOpen] = useState(false);

  // Mock data state (so actions can update UI)
  const initialOffers: Offer[] = useMemo(() => ([
    { id: 'offer_1', title: '20% Off Lunch Menu', status: 'active', splitPct: 22, discountType: 'percentage', userDiscountPct: 20 },
    { id: 'offer_2', title: '$10 Off $30+ Dinner', status: 'active', splitPct: 25, discountType: 'dollar', userDiscountCents: 1000, minSpendCents: 3000 },
    { id: 'offer_3', title: 'Happy Hour 30% Off', status: 'paused', splitPct: 20, discountType: 'happy_hour', userDiscountPct: 30 },
  ]), []);
  const [offers, setOffers] = useState<Offer[]>(initialOffers);

  const initialRequests: RequestItem[] = useMemo(() => ([
    { id: 'req_a', influencer: 'AustinEats', followers: 55000, proposedSplitPct: 28, discountType: 'percentage', userDiscountPct: 20, createdAt: new Date(Date.now() - 2*24*60*60*1000), status: 'pending' },
    { id: 'req_b', influencer: 'TXFoodie', followers: 18000, proposedSplitPct: 22, discountType: 'dollar', userDiscountCents: 500, minSpendCents: 2000, createdAt: new Date(Date.now() - 5*24*60*60*1000), status: 'countered' },
  ]), []);
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);

  const initialPrograms: ProgramItem[] = useMemo(() => ([
    { id: 'prog_1', influencer: 'AustinEats', offerTitle: '20% Off Lunch Menu', redemptions: 34, payoutCents: 12250, since: new Date(Date.now() - 10*24*60*60*1000) },
    { id: 'prog_2', influencer: 'BBQQuest', offerTitle: '$10 Off $30+ Dinner', redemptions: 18, payoutCents: 7200, since: new Date(Date.now() - 6*24*60*60*1000) },
  ]), []);
  const [programs, setPrograms] = useState<ProgramItem[]>(initialPrograms);

  const totalPayoutCents = programs.reduce((sum, p) => sum + p.payoutCents, 0);
  const totalRedemptions = programs.reduce((sum, p) => sum + p.redemptions, 0);
  const activeOffers = offers.filter(o => o.status === 'active').length;

  const formatMoney = (cents?: number) => typeof cents === 'number' ? `$${(cents/100).toFixed(2)}` : '$0.00';
  const timeAgo = (d: Date) => {
    const days = Math.floor((Date.now() - d.getTime()) / (1000*60*60*24));
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

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
                <p className="text-xl font-bold text-orange-600">{requests.filter(r => r.status === 'pending').length}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map(o => (
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
                  <Button variant="outline" size="sm" onClick={() => setOffers(prev => prev.map(x => x.id === o.id ? { ...x, status: x.status === 'active' ? 'paused' : 'active' } : x))}>
                    {o.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                  <Button variant="outline" size="sm">View Performance</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Influencer Requests */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Influencer Requests ({requests.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map(r => (
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
                        onClick={() => {
                          // Move to programs and remove from requests (mock approve)
                          setPrograms(prev => ([...prev, { id: `prog_${Date.now()}`, influencer: r.influencer, offerTitle: r.discountType === 'happy_hour' ? 'Happy Hour Program' : 'Custom Program', redemptions: 0, payoutCents: 0, since: new Date() }]));
                          setRequests(prev => prev.filter(x => x.id !== r.id));
                        }}
                      >
                        Approve
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => setCounterReqId(r.id)}>Counter</Button>
                      <Button className="flex-1" variant="outline" onClick={() => setRequests(prev => prev.filter(x => x.id !== r.id))}>Decline</Button>
                    </>
                  ) : (
                    <Button className="flex-1" variant="outline" disabled>Awaiting Response</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Active Programs */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Active Programs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p => (
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
                  <Button variant="outline" size="sm">Message</Button>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Counter Offer Dialog */}
      {counterReqId && (
        <CounterOfferDialog 
          open={true} 
          onClose={() => setCounterReqId(null)} 
          onCounter={(payload) => {
            // Update request status to countered
            setRequests(prev => prev.map(x => x.id === counterReqId ? { ...x, status: 'countered', proposedSplitPct: payload.splitPct, discountType: payload.discountType, userDiscountPct: payload.userDiscountPct, userDiscountCents: payload.userDiscountCents, minSpendCents: payload.minSpendCents } : x));
            setCounterReqId(null);
          }}
        />
      )}

      {/* Create Offer Dialog (simple) */}
      {createDialogOpen && (
        <CreateOfferDialog 
          open={true} 
          onClose={() => setCreateDialogOpen(false)}
          onCreate={(offer) => {
            setOffers(prev => [{ id: `offer_${Date.now()}`, ...offer }, ...prev]);
            setCreateDialogOpen(false);
          }}
        />
      )}

      {findDialogOpen && (
        <FindInfluencersDialog 
          open={true} 
          onClose={() => setFindDialogOpen(false)}
          onSendRequest={(req) => {
            setRequests(prev => [{ id: `req_${Date.now()}`, ...req, createdAt: new Date(), status: 'pending' }, ...prev]);
            setFindDialogOpen(false);
          }}
        />
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
            <Button className="flex-1" onClick={() => { 
              onCounter({ splitPct, discountType, userDiscountPct, userDiscountCents, minSpendCents }); 
              setSent(true);
            }}>Send Counter</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateOfferDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (offer: Omit<Offer, 'id' | 'status'> & { status?: Offer['status'] }) => void }) {
  const [title, setTitle] = useState('');
  const [splitPct, setSplitPct] = useState(20);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [userDiscountPct, setUserDiscountPct] = useState(20);
  const [userDiscountCents, setUserDiscountCents] = useState(500);
  const [minSpendCents, setMinSpendCents] = useState(0);
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

function FindInfluencersDialog({ open, onClose, onSendRequest }: { open: boolean; onClose: () => void; onSendRequest: (req: Omit<RequestItem, 'id' | 'createdAt' | 'status'>) => void }) {
  const [query, setQuery] = useState('');
  const influencers = [
    { handle: 'AustinEats', followers: 55000 },
    { handle: 'TXFoodie', followers: 18000 },
    { handle: 'ATXBrunchClub', followers: 32000 },
    { handle: 'BBQQuest', followers: 42000 },
  ];
  const results = influencers.filter(i => i.handle.toLowerCase().includes(query.toLowerCase()));
  const [selected, setSelected] = useState<string | null>(null);
  const [splitPct, setSplitPct] = useState(20);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [userDiscountPct, setUserDiscountPct] = useState(20);
  const [userDiscountCents, setUserDiscountCents] = useState(500);
  const [minSpendCents, setMinSpendCents] = useState(0);
  const [sent, setSent] = useState(false);

  const canSend = Boolean(selected);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find Influencers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {sent && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">Request sent.</div>
          )}
          <input 
            placeholder="Search by handle..." 
            className="w-full px-3 py-2 border rounded-md" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-auto">
            {results.map(r => (
              <Card key={r.handle} className={`cursor-pointer ${selected === r.handle ? 'ring-2 ring-brand' : ''}`} onClick={() => setSelected(r.handle)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{r.handle}</p>
                      <p className="text-sm text-muted-foreground">{r.followers.toLocaleString()} followers</p>
                    </div>
                    {selected === r.handle && <Badge>Selected</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Split (%)</label>
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
            <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            <Button 
              className="flex-1" 
              disabled={!canSend}
              onClick={() => {
                if (!selected) return;
                onSendRequest({ influencer: selected, followers: influencers.find(i => i.handle === selected)?.followers || 0, proposedSplitPct: splitPct, discountType, userDiscountPct, userDiscountCents, minSpendCents });
                setSent(true);
              }}
            >
              Send Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}