'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Instagram, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { SendRequestDialog } from '@/components/send-request-dialog';

interface Influencer {
  id: string;
  displayName: string;
  email: string;
  handle?: string;
  followers: number;
  tier: string;
  platform: 'instagram' | 'tiktok' | 'both';
  platforms?: string[];
  verified: boolean;
  location?: string;
  bio?: string;
  engagementRate?: number;
}

interface FindInfluencersDialogProps {
  open: boolean;
  onClose: () => void;
  onSendRequest?: (req: any) => void;
}

export function FindInfluencersDialog({ open, onClose, onSendRequest }: FindInfluencersDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [followerFilter, setFollowerFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const followerRanges = [
    { value: 'all', label: 'All Followers' },
    { value: '1k-10k', label: '1K - 10K', min: 1000, max: 10000 },
    { value: '10k-50k', label: '10K - 50K', min: 10000, max: 50000 },
    { value: '50k-100k', label: '50K - 100K', min: 50000, max: 100000 },
    { value: '100k-500k', label: '100K - 500K', min: 100000, max: 500000 },
    { value: '500k+', label: '500K+', min: 500000, max: Infinity }
  ];

  const searchInfluencers = async (reset = false) => {
    if (loading || !user?.uid) return;
    
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      
      // Use API endpoint with businessId parameter
      const params = new URLSearchParams({
        businessId: user.uid,
        search: searchQuery,
        tier: tierFilter === 'all' ? '' : tierFilter,
        platform: platformFilter === 'all' ? '' : platformFilter,
        limit: '100',
        offset: currentOffset.toString()
      });

      // Add follower range filters
      if (followerFilter !== 'all') {
        const range = followerRanges.find(r => r.value === followerFilter);
        if (range && range.min !== undefined) {
          params.append('minFollowers', range.min.toString());
          if (range.max !== Infinity) {
            params.append('maxFollowers', range.max.toString());
          }
        }
      }

      const response = await fetch(`/api/business/influencers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch influencers');
      }

      const data = await response.json();
      
      if (reset) {
        setInfluencers(data.influencers || []);
        setOffset(data.influencers?.length || 0);
      } else {
        setInfluencers(prev => [...prev, ...(data.influencers || [])]);
        setOffset(prev => prev + (data.influencers?.length || 0));
      }
      
      setTotalCount(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error searching influencers:', error);
      toast.error('Failed to load influencers');
      if (reset) {
        setInfluencers([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      searchInfluencers(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Reset filters when dialog opens
      setSearchQuery('');
      setFollowerFilter('all');
      setTierFilter('all');
      setPlatformFilter('all');
      setOffset(0);
      searchInfluencers(true);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setOffset(0);
      searchInfluencers(true);
    }
  }, [followerFilter, tierFilter, platformFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (open) {
        searchInfluencers(true);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      // Legacy tier mappings
      case 's': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'm': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'l': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'xl': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'huge': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSendRequest = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setShowRequestDialog(true);
  };

  const handleRequestSubmit = (requestData: any) => {
    if (onSendRequest) {
      onSendRequest(requestData);
    }
    setShowRequestDialog(false);
    setSelectedInfluencer(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Influencers
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={followerFilter} onValueChange={setFollowerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Followers" />
              </SelectTrigger>
              <SelectContent>
                {followerRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="both">Both Platforms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Header */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between py-2 border-b">
              <p className="text-sm text-muted-foreground">
                Showing {influencers.length} of {totalCount.toLocaleString()} influencers
              </p>
              {hasMore && (
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              )}
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-y-auto max-h-96 space-y-3">
            {loading && influencers.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-muted-foreground">Searching influencers...</p>
              </div>
            ) : influencers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No influencers found matching your criteria.</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {influencers.map((influencer) => (
                    <Card key={influencer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {influencer.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{influencer.displayName}</h3>
                                {influencer.verified && (
                                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                              {influencer.handle && (
                                <div className="text-sm text-muted-foreground mb-1">
                                  {influencer.handle}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span>{formatFollowers(influencer.followers)} followers</span>
                                <div className="flex items-center gap-1 ml-2">
                                  {influencer.platforms?.includes('instagram') && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                                      <Instagram className="w-3 h-3" />
                                      <span>IG</span>
                                    </div>
                                  )}
                                  {influencer.platforms?.includes('tiktok') && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-black text-white rounded-full text-xs">
                                      <MessageCircle className="w-3 h-3" />
                                      <span>TT</span>
                                    </div>
                                  )}
                                  {influencer.platforms?.includes('youtube') && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                      <span>YT</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {influencer.bio && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {influencer.bio}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getTierColor(influencer.tier)}>
                              Tier {influencer.tier}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleSendRequest(influencer)}
                            >
                              Send Request
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center py-4">
                    <Button
                      variant="outline"
                      onClick={() => searchInfluencers(false)}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
      
      <SendRequestDialog
        open={showRequestDialog}
        onClose={() => {
          setShowRequestDialog(false);
          setSelectedInfluencer(null);
        }}
        influencer={selectedInfluencer}
        onSendRequest={handleRequestSubmit}
      />
    </Dialog>
  );
}
