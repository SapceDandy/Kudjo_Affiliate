'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Steps } from '@/components/ui/steps';
import { BasicInfoForm } from './basic-info-form';
import { PosSelectionForm } from './pos-selection-form';
import { PosSetupForm } from './pos-setup-form';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  const { user } = useAuth();

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
      await setDoc(doc(db, 'businesses', user.uid), {
        id: user.uid,
        ownerId: user.uid,
        name: nextData.name,
        address: nextData.address,
        defaultSplitPct: nextData.defaultSplitPct,
        couponSettings: {
          defaultDiscountPct: nextData.defaultSplitPct,
          tierSplits: { Bronze: 10, Silver: 15, Gold: 20, Platinum: 25 },
          maxActiveInfluencers: 5,
          couponLimit: 100,
        },
        posProvider: nextData.posProvider,
        status: 'active',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } finally {
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