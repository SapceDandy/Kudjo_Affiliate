import { cn } from '@/lib/utils';

interface StepsProps {
  steps: string[];
  currentStep: number;
}

export function Steps({ steps, currentStep }: StepsProps) {
  return (
    <div className="flex items-center justify-center space-x-4">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              'h-8 w-8 rounded-full border-2 flex items-center justify-center',
              currentStep === index
                ? 'border-primary bg-primary text-primary-foreground'
                : index < currentStep
                ? 'border-primary bg-primary/20'
                : 'border-muted'
            )}
          >
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn('h-0.5 w-12', index < currentStep ? 'bg-primary' : 'bg-muted')}
            />
          )}
        </div>
      ))}
    </div>
  );
} 