'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Steps } from '@/components/ui/steps';
import { BasicInfoForm } from './basic-info-form';
import { PosSelectionForm } from './pos-selection-form';
import { PosSetupForm } from './pos-setup-form';

const STEPS = ['Basic Info', 'POS Selection', 'POS Setup'];

export default function OnboardPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    defaultSplitPct: 20,
    posProvider: '' as 'square' | 'manual' | 'clover',
  });
  const router = useRouter();

  const handleNext = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      router.push('/business');
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Business Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <Steps steps={STEPS} currentStep={step} />
          {step === 0 && <BasicInfoForm onNext={handleNext} initialData={formData} />}
          {step === 1 && <PosSelectionForm onNext={handleNext} initialData={formData} />}
          {step === 2 && <PosSetupForm onNext={handleNext} initialData={formData} />}
        </CardContent>
      </Card>
    </div>
  );
} 