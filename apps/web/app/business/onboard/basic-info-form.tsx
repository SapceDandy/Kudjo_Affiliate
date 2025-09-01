'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AddressAutocomplete } from '@/components/ui/google-places-autocomplete';
import { MapPin, CheckCircle } from 'lucide-react';

interface BasicInfoFormProps {
  onNext: (data: { name: string; address: string; website: string; overview: string; defaultSplitPct: number }) => void;
  initialData: { name: string; address: string; website: string; overview: string; defaultSplitPct: number };
}

export function BasicInfoForm({ onNext, initialData }: BasicInfoFormProps) {
  const [name, setName] = useState(initialData.name);
  const [address, setAddress] = useState(initialData.address);
  const [website, setWebsite] = useState(initialData.website);
  const [overview, setOverview] = useState(initialData.overview);
  const [defaultSplitPct, setDefaultSplitPct] = useState(initialData.defaultSplitPct);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressVerified, setAddressVerified] = useState(false);
  const [selectedPlaceData, setSelectedPlaceData] = useState<any>(null);

  const handleAddressChange = (newAddress: string, placeData?: any) => {
    setAddress(newAddress);
    setSelectedPlaceData(placeData);
    setErrors(prev => ({ ...prev, address: '' }));
  };

  const handleAddressVerified = (verified: boolean, placeData?: any) => {
    setAddressVerified(verified);
    setSelectedPlaceData(placeData);
    if (verified) {
      setErrors(prev => ({ ...prev, address: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Business Name is required';
    }
    
    if (!address.trim()) {
      newErrors.address = 'Business address is required';
    }
    
    if (!overview.trim()) {
      newErrors.overview = 'Business overview is required';
    }
    
    if (defaultSplitPct < 1 || defaultSplitPct > 100) {
      newErrors.defaultSplitPct = 'Split percentage must be between 1 and 100';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      if (!addressVerified) {
        newErrors.address = 'Please select an address from the dropdown suggestions';
        setErrors(newErrors);
        return;
      }
      onNext({
        name,
        address,
        website,
        overview,
        defaultSplitPct
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" role="form">
      <div>
        <Label htmlFor="name">Business Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: '' }));
          }}
          className={errors.name ? 'border-red-500' : ''}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          required
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-red-500 mt-1">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="address">Business Address</Label>
        <AddressAutocomplete
          value={address}
          onChange={handleAddressChange}
          onVerified={handleAddressVerified}
          placeholder="Start typing your business address..."
          className={errors.address ? 'border-red-500' : ''}
          error={errors.address}
        />
        {errors.address && (
          <p id="address-error" className="text-sm text-red-500 mt-1">
            {errors.address}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="website">Business Website (Optional)</Label>
        <Input
          id="website"
          type="url"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setErrors((prev) => ({ ...prev, website: '' }));
          }}
          placeholder="https://www.yourbusiness.com"
          className={errors.website ? 'border-red-500' : ''}
          aria-invalid={!!errors.website}
          aria-describedby={errors.website ? 'website-error' : undefined}
        />
        {errors.website && (
          <p id="website-error" className="text-sm text-red-500 mt-1">
            {errors.website}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="overview">Business Overview</Label>
        <Textarea
          id="overview"
          value={overview}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setOverview(e.target.value);
            setErrors((prev) => ({ ...prev, overview: '' }));
          }}
          placeholder="Tell us about your business, what you offer, and what makes you unique..."
          className={errors.overview ? 'border-red-500' : ''}
          aria-invalid={!!errors.overview}
          aria-describedby={errors.overview ? 'overview-error' : undefined}
          rows={4}
          required
        />
        {errors.overview && (
          <p id="overview-error" className="text-sm text-red-500 mt-1">
            {errors.overview}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="defaultSplitPct">Default Split % for Influencers</Label>
        <Input
          id="defaultSplitPct"
          type="number"
          min="1"
          max="100"
          value={defaultSplitPct}
          onChange={(e) => {
            setDefaultSplitPct(Number(e.target.value));
            setErrors((prev) => ({ ...prev, defaultSplitPct: '' }));
          }}
          className={errors.defaultSplitPct ? 'border-red-500' : ''}
          aria-invalid={!!errors.defaultSplitPct}
          aria-describedby={errors.defaultSplitPct ? 'split-error' : undefined}
          required
        />
        {errors.defaultSplitPct && (
          <p id="split-error" className="text-sm text-red-500 mt-1">
            {errors.defaultSplitPct}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full">Next</Button>
    </form>
  );
} 