import { Spinner } from './spinner';

interface LoadingProps {
  text?: string;
}

export function Loading({ text = 'Loading...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <Spinner role="status" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
} 