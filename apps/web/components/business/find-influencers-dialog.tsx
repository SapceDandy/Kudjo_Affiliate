'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Search, Users, MapPin, Instagram, MessageCircle, Star, Verified } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface Influencer {
  id: string;
  name: string;
  username?: string;
  followers: number;
  tier: string;
  verified: boolean;
  location?: string;
  bio?: string;
  profileImage?: string;
  platforms: string[];
  engagementRate: number;
  categories: string[];
  lastActive: Date;
}

interface FindInfluencersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onRequestSent?: () => void;
}

export function FindInfluencersDialog({ 
  open, 
  onOpenChange, 
  businessId,
  onRequestSent 
}: FindInfluencersDialogProps) {
  const [step, setStep] = useState<'search' | 'request'>('search');
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    tier: 'all',
    minFollowers: '',
    maxFollowers: '',
    location: '',
    verified: false
  });
  
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Request form data
  const [requestData, setRequestData] = useState({
    title: '',
    description: '',
    proposedSplitPct: 25,
    discountType: 'percentage' as 'percentage' | 'fixed',
    userDiscountPct: 20,
    userDiscountCents: 500,
    minSpendCents: 2000
  });

  const searchInfluencers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('query', searchQuery);
      if (filters.tier !== 'all') params.append('tier', filters.tier);
      if (filters.minFollowers) params.append('minFollowers', filters.minFollowers);
      if (filters.maxFollowers) params.append('maxFollowers', filters.maxFollowers);
      if (filters.location) params.append('location', filters.location);
      if (filters.verified) params.append('verified', 'true');
      params.append('limit', '20');

      const response = await fetch(`/api/business/influencers/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to search influencers');
      }

      const data = await response.json();
      setInfluencers(data.influencers || []);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error searching influencers:', error);
      toast.error('Failed to search influencers');
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async () => {
    if (!selectedInfluencer) return;
    
    setSending(true);
    try {
      const response = await fetch('/api/business/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          influencerId: selectedInfluencer.id,
          influencer: selectedInfluencer.name,
          followers: selectedInfluencer.followers,
          tier: selectedInfluencer.tier,
          title: requestData.title,
          description: requestData.description,
          proposedSplitPct: requestData.proposedSplitPct,
          discountType: requestData.discountType,
          userDiscountPct: requestData.discountType === 'percentage' ? requestData.userDiscountPct : undefined,
          userDiscountCents: requestData.discountType === 'fixed' ? requestData.userDiscountCents : undefined,
          minSpendCents: requestData.minSpendCents
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send request');
      }

      toast.success(`Request sent to ${selectedInfluencer.name}!`);
      onRequestSent?.();
      onOpenChange(false);
      
      // Reset form
      setStep('search');
      setSelectedInfluencer(null);
      setRequestData({
        title: '',
        description: '',
        proposedSplitPct: 25,
        discountType: 'percentage',
        userDiscountPct: 20,
        userDiscountCents: 500,
        minSpendCents: 2000
      });
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast.error(error.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getTierColor = (tier: string) => {
    const colors = {
      'Nano': 'bg-blue-100 text-blue-800',
      'Micro': 'bg-green-100 text-green-800',
      'Mid': 'bg-yellow-100 text-yellow-800',
      'Macro': 'bg-orange-100 text-orange-800',
      'Mega': 'bg-red-100 text-red-800'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    if (open) {
      searchInfluencers();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' ? 'Find Influencers' : `Send Request to ${selectedInfluencer?.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' ? (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, username, or bio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={searchInfluencers} disabled={loading}>
                  Search
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label>Tier</Label>
                  <Select value={filters.tier} onValueChange={(value) => setFilters(prev => ({ ...prev, tier: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="Nano">Nano (1K-10K)</SelectItem>
                      <SelectItem value="Micro">Micro (10K-100K)</SelectItem>
                      <SelectItem value="Mid">Mid (100K-1M)</SelectItem>
                      <SelectItem value="Macro">Macro (1M+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Followers</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1000"
                    value={filters.minFollowers}
                    onChange={(e) => setFilters(prev => ({ ...prev, minFollowers: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Max Followers</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 100000"
                    value={filters.maxFollowers}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxFollowers: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="City, State"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant={filters.verified ? 'default' : 'outline'}
                    onClick={() => setFilters(prev => ({ ...prev, verified: !prev.verified }))}
                    className="w-full"
                  >
                    <Verified className="w-4 h-4 mr-2" />
                    Verified Only
                  </Button>
                </div>
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <Loading />
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Found {influencers.length} influencers
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {influencers.map((influencer) => (
                    <Card key={influencer.id} className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedInfluencer(influencer);
                            setStep('request');
                          }}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {influencer.profileImage ? (
                              <img 
                                src={influencer.profileImage} 
                                alt={influencer.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{influencer.name}</CardTitle>
                                {influencer.verified && <Verified className="w-4 h-4 text-blue-500" />}
                              </div>
                              {influencer.username && (
                                <p className="text-sm text-muted-foreground">@{influencer.username}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={getTierColor(influencer.tier)}>
                            {influencer.tier}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {formatFollowers(influencer.followers)} followers
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4" />
                              {(influencer.engagementRate * 100).toFixed(1)}% engagement
                            </span>
                          </div>
                          
                          {influencer.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {influencer.location}
                            </div>
                          )}
                          
                          {influencer.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {influencer.bio}
                            </p>
                          )}
                          
                          <div className="flex gap-1 flex-wrap">
                            {influencer.platforms.map((platform) => (
                              <Badge key={platform} variant="outline" className="text-xs">
                                {platform === 'instagram' && <Instagram className="w-3 h-3 mr-1" />}
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Influencer Summary */}
            {selectedInfluencer && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    {selectedInfluencer.profileImage ? (
                      <img 
                        src={selectedInfluencer.profileImage} 
                        alt={selectedInfluencer.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{selectedInfluencer.name}</h3>
                        {selectedInfluencer.verified && <Verified className="w-5 h-5 text-blue-500" />}
                        <Badge className={getTierColor(selectedInfluencer.tier)}>
                          {selectedInfluencer.tier}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {formatFollowers(selectedInfluencer.followers)} followers • {(selectedInfluencer.engagementRate * 100).toFixed(1)}% engagement
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Request Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Request Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Weekend Brunch Collaboration"
                  value={requestData.title}
                  onChange={(e) => setRequestData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your collaboration proposal..."
                  value={requestData.description}
                  onChange={(e) => setRequestData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="splitPct">Influencer Split (%)</Label>
                  <Input
                    id="splitPct"
                    type="number"
                    min="1"
                    max="50"
                    value={requestData.proposedSplitPct}
                    onChange={(e) => setRequestData(prev => ({ ...prev, proposedSplitPct: parseInt(e.target.value) || 25 }))}
                  />
                </div>

                <div>
                  <Label>Discount Type</Label>
                  <Select 
                    value={requestData.discountType} 
                    onValueChange={(value: 'percentage' | 'fixed') => setRequestData(prev => ({ ...prev, discountType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {requestData.discountType === 'percentage' ? (
                  <div>
                    <Label htmlFor="userDiscountPct">Customer Discount (%)</Label>
                    <Input
                      id="userDiscountPct"
                      type="number"
                      min="1"
                      max="50"
                      value={requestData.userDiscountPct}
                      onChange={(e) => setRequestData(prev => ({ ...prev, userDiscountPct: parseInt(e.target.value) || 20 }))}
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="userDiscountCents">Customer Discount ($)</Label>
                    <Input
                      id="userDiscountCents"
                      type="number"
                      min="100"
                      step="100"
                      value={requestData.userDiscountCents / 100}
                      onChange={(e) => setRequestData(prev => ({ ...prev, userDiscountCents: (parseInt(e.target.value) || 5) * 100 }))}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="minSpend">Minimum Spend ($)</Label>
                  <Input
                    id="minSpend"
                    type="number"
                    min="0"
                    step="5"
                    value={requestData.minSpendCents / 100}
                    onChange={(e) => setRequestData(prev => ({ ...prev, minSpendCents: (parseInt(e.target.value) || 20) * 100 }))}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setStep('search')}
                disabled={sending}
              >
                Back to Search
              </Button>
              <Button 
                onClick={sendRequest}
                disabled={sending || !requestData.title || !requestData.description}
              >
                {sending ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
