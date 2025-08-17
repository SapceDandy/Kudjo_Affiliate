'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PosSelectionFormProps {
  onNext: (data: { posProvider: string }) => void;
  initialData: { posProvider: string };
}

export function PosSelectionForm({ onNext, initialData }: PosSelectionFormProps) {
  const handleSelect = (provider: string) => {
    onNext({ posProvider: provider });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center">Select POS Provider</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer hover:border-primary transition-colors ${
            initialData.posProvider === 'square' ? 'border-primary' : ''
          }`}
          onClick={() => handleSelect('square')}
          role="button"
          aria-label="Square"
        >
          <CardContent className="p-4 text-center">
            <h3 className="font-semibold mb-2">Square</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Square account for automatic redemption tracking
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:border-primary transition-colors ${
            initialData.posProvider === 'clover' ? 'border-primary' : ''
          }`}
          onClick={() => handleSelect('clover')}
          role="button"
          aria-label="Clover"
        >
          <CardContent className="p-4 text-center">
            <h3 className="font-semibold mb-2">Clover</h3>
            <p className="text-sm text-muted-foreground">
              Coming soon - Connect your Clover POS system
            </p>
            <p className="text-xs text-muted-foreground mt-2">(Not available in MVP)</p>
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