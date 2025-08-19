import { Spinner } from './spinner';

interface LoadingProps {
  text?: string;
  message?: string; // Support both prop names for backward compatibility
}

export function Loading({ text, message }: LoadingProps) {
  const displayText = text || message || 'Loading...';
  
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <Spinner role="status" />
      <p className="text-sm text-muted-foreground">{displayText}</p>
    </div>
  );
} 