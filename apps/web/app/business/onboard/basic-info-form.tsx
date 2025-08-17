'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface BasicInfoFormProps {
  onNext: (data: { name: string; address: string; defaultSplitPct: number }) => void;
  initialData: { name: string; address: string; defaultSplitPct: number };
}

export function BasicInfoForm({ onNext, initialData }: BasicInfoFormProps) {
  const [name, setName] = useState(initialData.name);
  const [address, setAddress] = useState(initialData.address);
  const [defaultSplitPct, setDefaultSplitPct] = useState(initialData.defaultSplitPct);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name) {
      newErrors.name = 'Business Name is required';
    }
    if (!address) {
      newErrors.address = 'Address is required';
    }
    if (defaultSplitPct < 1 || defaultSplitPct > 100) {
      newErrors.defaultSplitPct = 'Split percentage must be between 1 and 100';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext({ name, address, defaultSplitPct });
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
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setErrors((prev) => ({ ...prev, address: '' }));
          }}
          className={errors.address ? 'border-red-500' : ''}
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? 'address-error' : undefined}
          required
        />
        {errors.address && (
          <p id="address-error" className="text-sm text-red-500 mt-1">
            {errors.address}
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