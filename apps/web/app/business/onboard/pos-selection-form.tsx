'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingData {
  name: string;
  address: string;
  defaultSplitPct: number;
  posProvider: 'square' | 'manual' | 'clover';
}

interface PosSelectionFormProps {
  onNext: (data: Partial<OnboardingData>) => void;
  initialData: OnboardingData;
}

export function PosSelectionForm({ onNext, initialData }: PosSelectionFormProps) {
  const handleSelect = (provider: 'square' | 'manual' | 'clover') => {
    onNext({ posProvider: provider });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">Select POS Provider</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="opacity-50 cursor-not-allowed border-gray-300"
          role="button"
          aria-label="Square (Disabled)"
          aria-disabled="true"
        >
          <CardContent className="p-4 text-center">
            <h3 className="font-semibold mb-2 text-gray-500">Square</h3>
            <p className="text-sm text-gray-400">
              Coming soon - Square integration not yet available
            </p>
            <p className="text-xs text-red-500 mt-2">Currently unavailable</p>
          </CardContent>
        </Card>

        <Card
          className="opacity-50 cursor-not-allowed border-gray-300"
          role="button"
          aria-label="Clover (Disabled)"
          aria-disabled="true"
        >
          <CardContent className="p-4 text-center">
            <h3 className="font-semibold mb-2 text-gray-500">Clover</h3>
            <p className="text-sm text-gray-400">
              Coming soon - Clover integration not yet available
            </p>
            <p className="text-xs text-red-500 mt-2">Currently unavailable</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:border-primary transition-colors ${
            initialData.posProvider === 'manual' ? 'border-primary' : ''
          }`}
          onClick={() => handleSelect('manual')}
          role="button"
          aria-label="Manual Mode"
        >
          <CardContent className="p-4 text-center">
            <h3 className="font-semibold mb-2">Manual Mode</h3>
            <p className="text-sm text-muted-foreground">
              Enter redemptions manually with nightly reconciliation
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Select your preferred point-of-sale system for tracking offer redemptions
      </div>
    </div>
  );
} 