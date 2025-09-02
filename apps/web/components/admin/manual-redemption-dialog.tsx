'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, User, Store, Receipt } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface ManualRedemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedemptionCreated?: () => void;
}

interface Business {
  id: string;
  name: string;
  address?: string;
}

interface Influencer {
  id: string;
  name: string;
  username?: string;
  followers: number;
  tier: string;
}

export function ManualRedemptionDialog({ 
  open, 
  onOpenChange, 
  onRedemptionCreated 
}: ManualRedemptionDialogProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [searchingBusinesses, setSearchingBusinesses] = useState(false);
  const [searchingInfluencers, setSearchingInfluencers] = useState(false);
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [createdRedemption, setCreatedRedemption] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    couponCode: '',
    businessId: '',
    influencerId: '',
    amount: '',
    description: '',
    redemptionDate: new Date().toISOString().split('T')[0], // Today's date
    notes: ''
  });

  const [businessSearch, setBusinessSearch] = useState('');
  const [influencerSearch, setInfluencerSearch] = useState('');

  const searchBusinesses = async (query: string) => {
    if (!query.trim()) {
      setBusinesses([]);
      return;
    }

    setSearchingBusinesses(true);
    try {
      const response = await fetch(`/api/admin/businesses/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.businesses || []);
      }
    } catch (error) {
      console.error('Error searching businesses:', error);
      toast.error('Failed to search businesses');
    } finally {
      setSearchingBusinesses(false);
    }
  };

  const searchInfluencers = async (query: string) => {
    if (!query.trim()) {
      setInfluencers([]);
      return;
    }

    setSearchingInfluencers(true);
    try {
      const response = await fetch(`/api/business/influencers/search?query=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setInfluencers(data.influencers || []);
      }
    } catch (error) {
      console.error('Error searching influencers:', error);
      toast.error('Failed to search influencers');
    } finally {
      setSearchingInfluencers(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.couponCode || !formData.businessId || !formData.influencerId || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amountCents = Math.round(parseFloat(formData.amount) * 100);
    if (amountCents <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/redemptions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: formData.couponCode,
          businessId: formData.businessId,
          influencerId: formData.influencerId,
          amountCents,
          description: formData.description || undefined,
          redemptionDate: formData.redemptionDate ? new Date(formData.redemptionDate).toISOString() : undefined,
          notes: formData.notes || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create redemption');
      }

      const result = await response.json();
      setCreatedRedemption(result.redemption);
      setStep('success');
      toast.success('Manual redemption created successfully!');
      onRedemptionCreated?.();

    } catch (error: any) {
      console.error('Error creating manual redemption:', error);
      toast.error(error.message || 'Failed to create redemption');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setFormData({
      couponCode: '',
      businessId: '',
      influencerId: '',
      amount: '',
      description: '',
      redemptionDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setBusinessSearch('');
    setInfluencerSearch('');
    setBusinesses([]);
    setInfluencers([]);
    setCreatedRedemption(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const selectedBusiness = businesses.find(b => b.id === formData.businessId);
  const selectedInfluencer = influencers.find(i => i.id === formData.influencerId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' ? 'Manual Redemption Entry' : 'Redemption Created'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="couponCode">Coupon Code *</Label>
                <Input
                  id="couponCode"
                  placeholder="e.g. AF-ABC123 or CM-XYZ789"
                  value={formData.couponCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="amount">Purchase Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="25.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="businessSearch">Business *</Label>
              <div className="space-y-2">
                <Input
                  id="businessSearch"
                  placeholder="Search for business..."
                  value={businessSearch}
                  onChange={(e) => {
                    setBusinessSearch(e.target.value);
                    searchBusinesses(e.target.value);
                  }}
                />
                {searchingBusinesses && <Loading />}
                {businesses.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {businesses.map((business) => (
                      <div
                        key={business.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                          formData.businessId === business.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, businessId: business.id }));
                          setBusinessSearch(business.name);
                          setBusinesses([]);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{business.name}</p>
                            {business.address && (
                              <p className="text-sm text-gray-500">{business.address}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedBusiness && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Store className="w-4 h-4" />
                    Selected: {selectedBusiness.name}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="influencerSearch">Influencer *</Label>
              <div className="space-y-2">
                <Input
                  id="influencerSearch"
                  placeholder="Search for influencer..."
                  value={influencerSearch}
                  onChange={(e) => {
                    setInfluencerSearch(e.target.value);
                    searchInfluencers(e.target.value);
                  }}
                />
                {searchingInfluencers && <Loading />}
                {influencers.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {influencers.map((influencer) => (
                      <div
                        key={influencer.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                          formData.influencerId === influencer.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, influencerId: influencer.id }));
                          setInfluencerSearch(influencer.name);
                          setInfluencers([]);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{influencer.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {influencer.tier}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              {influencer.followers.toLocaleString()} followers
                              {influencer.username && ` • @${influencer.username}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedInfluencer && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <User className="w-4 h-4" />
                    Selected: {selectedInfluencer.name} ({selectedInfluencer.tier})
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="redemptionDate">Redemption Date</Label>
                <Input
                  id="redemptionDate"
                  type="date"
                  value={formData.redemptionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, redemptionDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g. Brunch meal redemption"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes for this redemption..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !formData.couponCode || !formData.businessId || !formData.influencerId || !formData.amount}
              >
                {loading ? 'Creating...' : 'Create Redemption'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                <span className="font-medium">Redemption created successfully!</span>
              </div>
            </div>

            {createdRedemption && (
              <Card>
                <CardHeader>
                  <CardTitle>Redemption Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Coupon Code</Label>
                      <p className="font-mono">{createdRedemption.couponCode}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Amount</Label>
                      <p className="font-semibold">${(createdRedemption.amountCents / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Business</Label>
                      <p>{createdRedemption.businessName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Influencer</Label>
                      <p>{createdRedemption.influencerName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Earnings</Label>
                      <p className="text-green-600 font-semibold">
                        ${(createdRedemption.earningsCents / 100).toFixed(2)} ({createdRedemption.splitPct}%)
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Date</Label>
                      <p>{new Date(createdRedemption.redeemedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                Create Another
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
