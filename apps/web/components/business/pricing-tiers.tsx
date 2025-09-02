'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
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
import { Label } from '@/components/ui/label';

interface PricingTier {
  id: string;
  minFollowers: number;
  maxFollowers: number | null;
  commission: number; // Percentage
  flatFee: number | null; // In cents
}

interface PricingTiersProps {
  businessId: string;
  isAdmin?: boolean;
  onUpdate?: (tiers: PricingTier[]) => void;
}

export function PricingTiers({ businessId, isAdmin = false, onUpdate }: PricingTiersProps) {
  const [tiers, setTiers] = useState<PricingTier[]>([
    {
      id: '1',
      minFollowers: 0,
      maxFollowers: 10000,
      commission: 10,
      flatFee: null,
    },
    {
      id: '2',
      minFollowers: 10001,
      maxFollowers: 50000,
      commission: 15,
      flatFee: null,
    },
    {
      id: '3',
      minFollowers: 50001,
      maxFollowers: 100000,
      commission: 20,
      flatFee: null,
    },
    {
      id: '4',
      minFollowers: 100001,
      maxFollowers: null,
      commission: 25,
      flatFee: null,
    },
  ]);
  const [defaultCommission, setDefaultCommission] = useState(10);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');
  const [commission, setCommission] = useState('');
  const [flatFee, setFlatFee] = useState('');
  const [useCommission, setUseCommission] = useState(true);

  // Edit tier
  const handleEditTier = (tier: PricingTier) => {
    setEditingTier(tier);
    setMinFollowers(tier.minFollowers.toString());
    setMaxFollowers(tier.maxFollowers?.toString() || '');
    setCommission(tier.commission.toString());
    setFlatFee(tier.flatFee ? (tier.flatFee / 100).toString() : '');
    setUseCommission(tier.commission > 0);
    setIsEditing(true);
  };

  // Add new tier
  const handleAddTier = () => {
    setEditingTier(null);
    setMinFollowers('');
    setMaxFollowers('');
    setCommission('10');
    setFlatFee('');
    setUseCommission(true);
    setIsEditing(true);
  };

  // Delete tier
  const handleDeleteTier = (id: string) => {
    const updatedTiers = tiers.filter(tier => tier.id !== id);
    setTiers(updatedTiers);
    if (onUpdate) {
      onUpdate(updatedTiers);
    }
  };

  // Save tier
  const handleSaveTier = async () => {
    const minFollowersNum = parseInt(minFollowers);
    const maxFollowersNum = maxFollowers ? parseInt(maxFollowers) : null;
    const commissionNum = useCommission ? parseFloat(commission) : 0;
    const flatFeeNum = !useCommission && flatFee ? Math.round(parseFloat(flatFee) * 100) : null;

    let updatedTiers;
    if (editingTier) {
      // Update existing tier
      updatedTiers = tiers.map(tier => {
        if (tier.id === editingTier.id) {
          return {
            ...tier,
            minFollowers: minFollowersNum,
            maxFollowers: maxFollowersNum,
            commission: commissionNum,
            flatFee: flatFeeNum,
          };
        }
        return tier;
      });
    } else {
      // Add new tier
      const newTier: PricingTier = {
        id: Date.now().toString(),
        minFollowers: minFollowersNum,
        maxFollowers: maxFollowersNum,
        commission: commissionNum,
        flatFee: flatFeeNum,
      };
      updatedTiers = [...tiers, newTier].sort((a, b) => a.minFollowers - b.minFollowers);
    }

    try {
      // Save to API
      const response = await fetch('/api/business/tier-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          tiers: updatedTiers,
          defaultCommission,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save tier settings');
      }

      // Update local state only after successful API call
      setTiers(updatedTiers);
      if (onUpdate) {
        onUpdate(updatedTiers);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving tier settings:', error);
      toast.error('Failed to save tier settings');
    }
  };

  // Update default commission
  const handleUpdateDefaultCommission = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setDefaultCommission(value);
      
      try {
        // Save to API
        await fetch('/api/business/tier-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId,
            tiers,
            defaultCommission: value,
          }),
        });
      } catch (error) {
        console.error('Error updating default commission:', error);
      }
    }
  };

  // Format follower count
  const formatFollowers = (count: number | null) => {
    if (count === null) return 'Any';
    return count.toLocaleString();
  };

  // Format pricing
  const formatPricing = (tier: PricingTier) => {
    if (tier.commission > 0) {
      return `${tier.commission}%`;
    }
    if (tier.flatFee) {
      return `$${(tier.flatFee / 100).toFixed(2)} flat`;
    }
    return 'No fee';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pricing Tiers</span>
            {(isAdmin || !isEditing) && (
              <Button 
                onClick={handleAddTier} 
                className="bg-brand hover:bg-brand/90"
                disabled={isEditing}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tier
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Default Commission</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={defaultCommission}
                    onChange={handleUpdateDefaultCommission}
                    className="w-20"
                    min="0"
                    max="100"
                    disabled={!isAdmin}
                  />
                  <span className="text-gray-600">%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                This is the default commission rate for influencers that don't fit into any tier.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Followers (min)</TableHead>
                  <TableHead>Followers (max)</TableHead>
                  <TableHead>Pricing</TableHead>
                  {(isAdmin || !isEditing) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                      No pricing tiers defined. Add your first tier.
                    </TableCell>
                  </TableRow>
                ) : (
                  tiers.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell>{formatFollowers(tier.minFollowers)}</TableCell>
                      <TableCell>{formatFollowers(tier.maxFollowers)}</TableCell>
                      <TableCell>{formatPricing(tier)}</TableCell>
                      {(isAdmin || !isEditing) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditTier(tier)}
                              disabled={isEditing}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteTier(tier.id)}
                              disabled={isEditing}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Tier Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && setIsEditing(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTier ? 'Edit Pricing Tier' : 'Add Pricing Tier'}
            </DialogTitle>
            <DialogDescription>
              Define the follower range and pricing for this tier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Followers</Label>
                <Input 
                  type="number" 
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(e.target.value)}
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Max Followers (optional)</Label>
                <Input 
                  type="number" 
                  value={maxFollowers}
                  onChange={(e) => setMaxFollowers(e.target.value)}
                  min={parseInt(minFollowers) + 1 || 0}
                  placeholder="No limit"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="commission" 
                    checked={useCommission}
                    onChange={() => setUseCommission(true)}
                  />
                  <Label htmlFor="commission">Commission (%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="flatFee" 
                    checked={!useCommission}
                    onChange={() => setUseCommission(false)}
                  />
                  <Label htmlFor="flatFee">Flat Fee ($)</Label>
                </div>
              </div>
            </div>

            {useCommission ? (
              <div className="space-y-2">
                <Label>Commission Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="text-gray-600">%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Flat Fee (USD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">$</span>
                  <Input 
                    type="number" 
                    value={flatFee}
                    onChange={(e) => setFlatFee(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTier}
              className="bg-brand hover:bg-brand/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 