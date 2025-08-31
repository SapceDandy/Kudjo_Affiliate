'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Steps } from '@/components/ui/steps';
import { BasicInfoForm } from './basic-info-form';
import { PosSelectionForm } from './pos-selection-form';
import { PosSetupForm } from './pos-setup-form';
import { useDemoAuth } from '@/lib/demo-auth';
import toast from 'react-hot-toast';

interface OnboardingData {
  name: string;
  address: string;
  defaultSplitPct: number;
  posProvider: 'square' | 'manual' | 'clover';
}

const STEPS = ['Basic Info', 'POS Selection', 'POS Setup'];

export default function OnboardPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    address: '',
    defaultSplitPct: 20,
    posProvider: 'manual',
  });
  const router = useRouter();
  const { user } = useDemoAuth();

  const handleNext = async (data?: Partial<OnboardingData>) => {
    const nextData = data ? { ...formData, ...data } as OnboardingData : formData;
    setFormData(nextData);

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Finalize: persist defaults and mark business active
    if (!user?.uid) {
      router.push('/auth/signin');
      return;
    }
    
    try {
      // For demo mode, simulate successful business setup
      toast.success('Business setup completed successfully!');
      
      // In a real app, this would save to Firestore:
      // await setDoc(doc(db, 'businesses', user.uid), { ... });
      
      // Navigate to business dashboard
      router.push('/business');
    } catch (error) {
      console.error('Error setting up business:', error);
      toast.error('Failed to complete setup. Please try again.');
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