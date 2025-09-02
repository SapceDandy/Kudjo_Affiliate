'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Steps } from '@/components/ui/steps';
import { BasicInfoForm } from './basic-info-form';
import { PosSelectionForm } from './pos-selection-form';
import { PosSetupForm } from './pos-setup-form';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDemoAuth } from '@/lib/demo-auth';
import { OnboardingData } from './types';
import toast from 'react-hot-toast';

const STEPS = ['Basic Info', 'POS Selection', 'POS Setup'];

export default function OnboardPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    address: '',
    website: '',
    overview: '',
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
      setLoading(true);
      
      // Create business registration request for admin approval
      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: user.uid,
          name: nextData.name,
          address: nextData.address,
          website: nextData.website,
          overview: nextData.overview,
          defaultSplitPct: nextData.defaultSplitPct,
          posProvider: nextData.posProvider,
          status: 'pending_approval'
        })
      });

      if (response.ok) {
        toast.success('Business registration submitted! Redirecting to dashboard...');
        // For demo purposes, redirect to business dashboard instead of pending page
        router.push('/business');
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Error setting up business:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3">Setting up your business...</span>
            </div>
          ) : (
            <>
              {step === 0 && <BasicInfoForm onNext={handleNext} initialData={formData} />}
              {step === 1 && <PosSelectionForm onNext={handleNext} initialData={formData} />}
              {step === 2 && <PosSetupForm onNext={handleNext} initialData={formData} />}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 