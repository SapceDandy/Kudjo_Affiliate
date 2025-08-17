export function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }
  
  const Sentry = require('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
} 