'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Ban,
  User,
  Search,
  Plus,
  Trash,
  AlertTriangle,
  XCircle,
  Check,
} from 'lucide-react';

interface BlockedInfluencer {
  id: string;
  handle: string;
  name: string;
  followers: number;
  blockedAt: string;
  reason: string;
}

interface BlockedInfluencersProps {
  businessId: string;
}

export function BlockedInfluencers({ businessId }: BlockedInfluencersProps) {
  const [blockedInfluencers, setBlockedInfluencers] = useState<BlockedInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingInfluencer, setDeletingInfluencer] = useState<BlockedInfluencer | null>(null);
  
  // Form state
  const [newInfluencerHandle, setNewInfluencerHandle] = useState('');
  const [blockReason, setBlockReason] = useState('');
  
  // Fetch blocked influencers
  useEffect(() => {
    // In a real app, this would be an API call
    // For now, use mock data
    setTimeout(() => {
      const mockBlockedInfluencers = generateMockBlockedInfluencers();
      setBlockedInfluencers(mockBlockedInfluencers);
      setLoading(false);
    }, 500);
  }, []);

  // Generate mock blocked influencers
  const generateMockBlockedInfluencers = (): BlockedInfluencer[] => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `inf_${i + 100}`,
      handle: `@problematic_influencer${i}`,
      name: `Problem User ${i}`,
      followers: Math.floor(1000 + Math.random() * 100000),
      blockedAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      reason: [
        'Inappropriate content',
        'Violated terms of service',
        'Misrepresentation of products',
        'Spam behavior',
        'Harassment'
      ][Math.floor(Math.random() * 5)],
    }));
  };

  // Block a new influencer
  const handleBlockInfluencer = () => {
    if (!newInfluencerHandle || !blockReason) return;
    
    // In a real app, this would be an API call
    // For now, update local state
    const newBlockedInfluencer: BlockedInfluencer = {
      id: `inf_${Date.now()}`,
      handle: newInfluencerHandle,
      name: `User ${newInfluencerHandle.substring(1)}`,
      followers: Math.floor(1000 + Math.random() * 100000),
      blockedAt: new Date().toISOString(),
      reason: blockReason,
    };
    
    setBlockedInfluencers([...blockedInfluencers, newBlockedInfluencer]);
    setNewInfluencerHandle('');
    setBlockReason('');
    setShowAddDialog(false);
  };

  // Unblock an influencer
  const handleUnblockInfluencer = () => {
    if (!deletingInfluencer) return;
    
    // In a real app, this would be an API call
    // For now, update local state
    setBlockedInfluencers(blockedInfluencers.filter(inf => inf.id !== deletingInfluencer.id));
    setDeletingInfluencer(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format follower count
  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Filter blocked influencers by search query
  const filteredInfluencers = searchQuery
    ? blockedInfluencers.filter(inf => 
        inf.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inf.reason.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : blockedInfluencers;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Blocked Influencers
            </CardTitle>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Block Influencer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search blocked influencers..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Influencer</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Blocked On</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading blocked influencers...
                      </TableCell>
                    </TableRow>
                  ) : filteredInfluencers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No matching influencers found' : 'No blocked influencers'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInfluencers.map((influencer) => (
                      <TableRow key={influencer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium">{influencer.name}</div>
                              <div className="text-sm text-gray-500">{influencer.handle}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatFollowers(influencer.followers)}</TableCell>
                        <TableCell>{formatDate(influencer.blockedAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                            {influencer.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingInfluencer(influencer)}
                              >
                                <Trash className="w-4 h-4 mr-1" />
                                Unblock
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Unblock Influencer</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to unblock this influencer? They will be able to create campaigns with your business again.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-3">
                                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                  <div>
                                    <h4 className="font-medium text-yellow-800">Caution</h4>
                                    <p className="text-sm text-yellow-700">
                                      Unblocking this influencer will allow them to create new campaigns with your business.
                                      They were originally blocked for: <strong>{deletingInfluencer?.reason}</strong>
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 p-4 border rounded-lg">
                                  <div className="flex justify-between mb-2">
                                    <span className="font-medium">Influencer:</span>
                                    <span>{deletingInfluencer?.name} ({deletingInfluencer?.handle})</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">Blocked Since:</span>
                                    <span>{deletingInfluencer && formatDate(deletingInfluencer.blockedAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setDeletingInfluencer(null)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleUnblockInfluencer}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Confirm Unblock
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Blocked Influencer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block an Influencer</DialogTitle>
            <DialogDescription>
              Enter the influencer's handle and reason for blocking. Blocked influencers cannot create campaigns with your business.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Influencer Handle</label>
              <Input 
                placeholder="@username"
                value={newInfluencerHandle}
                onChange={(e) => setNewInfluencerHandle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Blocking</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              >
                <option value="">Select a reason...</option>
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Violated terms of service">Violated terms of service</option>
                <option value="Misrepresentation of products">Misrepresentation of products</option>
                <option value="Spam behavior">Spam behavior</option>
                <option value="Harassment">Harassment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {blockReason === 'Other' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Reason</label>
                <Input 
                  placeholder="Enter custom reason..."
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBlockInfluencer}
              className="bg-red-600 hover:bg-red-700"
              disabled={!newInfluencerHandle || !blockReason}
            >
              <Ban className="w-4 h-4 mr-2" />
              Block Influencer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 