'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';

interface CreateOfferDialogProps {
  open: boolean;
  onClose: () => void;
  onOfferCreated: () => void;
}

export function CreateOfferDialog({ open, onClose, onOfferCreated }: CreateOfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'dollar',
    userDiscountPct: 15,
    userDiscountCents: 500,
    splitPct: 20,
    minSpendCents: 0,
    terms: ''
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
          businessId: 'demo_business_user',
          title: formData.title,
          description: formData.description,
          discountType: formData.discountType,
          userDiscountPct: formData.discountType === 'percentage' ? formData.userDiscountPct : undefined,
          userDiscountCents: formData.discountType === 'dollar' ? formData.userDiscountCents : undefined,
          splitPct: formData.splitPct,
          minSpendCents: formData.minSpendCents,
          terms: formData.terms
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
        splitPct: 20,
        minSpendCents: 0,
        terms: ''
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                  onValueChange={(value: 'percentage' | 'dollar') => 
                    setFormData(prev => ({ ...prev, discountType: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="dollar">Dollar Amount Off</SelectItem>
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
              ) : (
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
              )}
            </div>
            
            <div>
              <Label htmlFor="minSpendCents">Minimum Spend ($)</Label>
              <Input
                id="minSpendCents"
                type="number"
                value={formData.minSpendCents / 100}
                onChange={(e) => setFormData(prev => ({ ...prev, minSpendCents: Number(e.target.value) * 100 }))}
                min={0}
                step={0.01}
                className="mt-1"
                placeholder="0 for no minimum"
              />
            </div>
          </div>

          {/* Commission Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Influencer Commission</h3>
            
            <div>
              <Label htmlFor="splitPct">Commission Percentage</Label>
              <Input
                id="splitPct"
                type="number"
                value={formData.splitPct}
                onChange={(e) => setFormData(prev => ({ ...prev, splitPct: Number(e.target.value) }))}
                min={10}
                max={60}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Influencer gets {formData.splitPct}% of each sale they generate
              </p>
            </div>
          </div>

          {/* Terms */}
          {/* <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Enter any specific terms, restrictions, or conditions..."
              className="mt-1"
              rows={3}
            />
          </div> */}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
