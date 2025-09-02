// Shared types for business onboarding flow

export interface OnboardingData {
  name: string;
  address: string;
  website: string;
  overview: string;
  defaultSplitPct: number;
  posProvider: 'square' | 'manual' | 'clover';
}

export interface OnboardingStepProps {
  onNext: (data?: Partial<OnboardingData>) => void;
  initialData: OnboardingData;
}

export type PosProvider = OnboardingData['posProvider'];
