'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth';

interface CreateOfferDialogProps {
  open: boolean;
  onClose: () => void;
  onOfferCreated: () => void;
}

export function CreateOfferDialog({ open, onClose, onOfferCreated }: CreateOfferDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  console.log('CreateOfferDialog render - open:', open);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed' | 'dollar' | 'bogo' | 'student' | 'happy_hour' | 'free_appetizer' | 'first_time',
    userDiscountPct: 15,
    userDiscountCents: 500,
    minSpendCents: 0,
    redemptionLimit: null as number | null,
    terms: '',
    exclusive: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter an offer title');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/business/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: user?.uid,
          title: formData.title,
          description: formData.description,
          discountType: formData.discountType,
          userDiscountPct: formData.discountType === 'percentage' ? formData.userDiscountPct : 0,
          userDiscountCents: (formData.discountType === 'dollar' || formData.discountType === 'fixed') ? formData.userDiscountCents : 0,
          minSpendCents: formData.minSpendCents || 0,
          redemptionLimit: formData.redemptionLimit,
          terms: formData.terms || '',
          splitPct: 25, // Default split percentage for general offers
          exclusive: formData.exclusive,
          tierSplits: {
            Small: 15,
            Medium: 20,
            Large: 25,
            XL: 30,
            Huge: 35
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create offer');
      }

      toast.success('Offer created successfully!');
      onOfferCreated();
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        discountType: 'percentage',
        userDiscountPct: 15,
        userDiscountCents: 500,
        minSpendCents: 0,
        redemptionLimit: null,
        terms: '',
        exclusive: false
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>Create New Offer</DialogTitle>
          <DialogDescription>
            Configure your offer details, discount settings, and commission structure.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Offer Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. 20% Off Weekend Brunch"
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your offer and what makes it special..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Discount Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Discount</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountType">Discount Type</Label>
                <Select 
                  value={formData.discountType} 
                  onValueChange={(value: 'percentage' | 'fixed' | 'dollar' | 'bogo' | 'student' | 'happy_hour' | 'free_appetizer' | 'first_time') => 
                    setFormData(prev => ({ ...prev, discountType: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed">Fixed Dollar Amount Off</SelectItem>
                    <SelectItem value="dollar">Dollar Amount Off</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                    <SelectItem value="student">Student Discount</SelectItem>
                    <SelectItem value="happy_hour">Happy Hour Special</SelectItem>
                    <SelectItem value="free_appetizer">Free Appetizer</SelectItem>
                    <SelectItem value="first_time">First-Time Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.discountType === 'percentage' ? (
                <div>
                  <Label htmlFor="userDiscountPct">Discount Percentage</Label>
                  <Input
                    id="userDiscountPct"
                    type="number"
                    value={formData.userDiscountPct}
                    onChange={(e) => setFormData(prev => ({ ...prev, userDiscountPct: Number(e.target.value) }))}
                    min={5}
                    max={60}
                    className="mt-1"
                  />
                </div>
              ) : (formData.discountType === 'dollar' || formData.discountType === 'fixed') ? (
                <div>
                  <Label htmlFor="userDiscountCents">Dollar Amount Off</Label>
                  <Input
                    id="userDiscountCents"
                    type="number"
                    value={formData.userDiscountCents / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, userDiscountCents: Number(e.target.value) * 100 }))}
                    min={1}
                    step={0.01}
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label>Special Offer Type</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                    {formData.discountType === 'bogo' && 'Buy one item, get another free or discounted'}
                    {formData.discountType === 'student' && 'Special discount for students with valid ID'}
                    {formData.discountType === 'happy_hour' && 'Time-based promotional pricing'}
                    {formData.discountType === 'free_appetizer' && 'Complimentary appetizer with purchase'}
                    {formData.discountType === 'first_time' && 'Special offer for new customers'}
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minSpendCents">Minimum Spend ($)</Label>
                <Input
                  id="minSpendCents"
                  type="number"
                  value={formData.minSpendCents === 0 ? '' : (formData.minSpendCents / 100).toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '0') {
                      setFormData(prev => ({ ...prev, minSpendCents: 0 }));
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setFormData(prev => ({ ...prev, minSpendCents: Math.round(numValue * 100) }));
                      }
                    }
                  }}
                  min={0}
                  step={0.01}
                  className="mt-1"
                  placeholder="0 for no minimum"
                />
              </div>
              
              <div>
                <Label htmlFor="redemptionLimit">Redemption Limit</Label>
                <Input
                  id="redemptionLimit"
                  type="number"
                  value={formData.redemptionLimit || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setFormData(prev => ({ ...prev, redemptionLimit: null }));
                    } else {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue > 0) {
                        setFormData(prev => ({ ...prev, redemptionLimit: numValue }));
                      }
                    }
                  }}
                  min={1}
                  className="mt-1"
                  placeholder="Unlimited"
                />
              </div>
            </div>
          </div>

          {/* Note about commission */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Commission Structure</h3>
              <p className="text-sm text-blue-700">
                Commission percentages are automatically calculated based on each influencer's tier when they view this offer. 
                You can set custom splits when sending direct collaboration requests.
              </p>
            </div>
          </div>

          {/* Terms */}
          <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Any special terms or conditions for this offer..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Exclusive Offer Option */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="exclusive"
                checked={formData.exclusive}
                onChange={(e) => setFormData(prev => ({ ...prev, exclusive: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="exclusive" className="text-sm font-medium">
                Make this an exclusive offer
              </Label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Exclusive offers appear in a separate section and are typically for special partnerships or limited collaborations.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
