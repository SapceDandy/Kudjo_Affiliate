import * as Sentry from '@sentry/nextjs';

// Sentry configuration for production monitoring
// Based on Next.js 14 App Router best practices

export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out known non-critical errors
      const error = hint.originalException;
      
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string;
        
        // Skip Firebase auth errors that are handled gracefully
        if (message.includes('auth/user-not-found') || 
            message.includes('auth/wrong-password')) {
          return null;
        }
        
        // Skip network errors during development
        if (process.env.NODE_ENV === 'development' && 
            message.includes('Failed to fetch')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Custom tags for better organization
    initialScope: {
      tags: {
        component: 'kudjo-affiliate'
      }
    }
  });
}

import { ErrorBoundary } from '@sentry/nextjs';

// Simple error boundary fallback to avoid JSX syntax errors in .ts files
export const SentryErrorBoundary = ErrorBoundary;
export const errorBoundaryFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => {
  console.error('Sentry Error Boundary:', error);
  return null;
};

// Custom error boundary for React components
export function withSentryErrorBoundary<T extends React.ComponentType<any>>(
  Component: T,
  options?: {
    showDialog?: boolean;
  }
): T {
  return Sentry.withErrorBoundary(Component, {
    showDialog: options?.showDialog ?? false,
  }) as T;
}

// API route error handler
export function withSentryApiHandler<T extends (...args: any[]) => any>(
  handler: T,
  options?: {
    captureRequestBody?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Capture API errors with context
      Sentry.withScope((scope) => {
        const [request] = args;
        
        if (request && typeof request === 'object') {
          scope.setTag('api.method', request.method);
          scope.setTag('api.url', request.url);
          
          if (options?.captureRequestBody && request.body) {
            scope.setContext('request', {
              body: request.body,
              headers: request.headers
            });
          }
        }
        
        Sentry.captureException(error);
      });
      
      throw error;
    }
  }) as T;
}

// Performance monitoring helpers
export const SentryPerformance = {
  // Track page load performance
  trackPageLoad: (pageName: string) => {
    const startTime = Date.now();
    
    return {
      finish: () => {
        const duration = Date.now() - startTime;
        Sentry.addBreadcrumb({
          message: `Page Load: ${pageName}`,
          category: 'navigation',
          level: 'info',
          data: { duration }
        });
      },
      setTag: (key: string, value: string) => {
        Sentry.setTag(key, value);
      },
      setData: (key: string, value: any) => {
        Sentry.setContext(key, value);
      }
    };
  },
  
  // Track API call performance
  trackApiCall: (endpoint: string, method: string) => {
    const startTime = Date.now();
    
    return {
      finish: () => {
        const duration = Date.now() - startTime;
        Sentry.addBreadcrumb({
          message: `API: ${method} ${endpoint}`,
          category: 'http',
          level: 'info',
          data: { duration }
        });
      },
      setTag: (key: string, value: string) => {
        Sentry.setTag(key, value);
      },
      setData: (key: string, value: any) => {
        Sentry.setContext(key, value);
      }
    };
  },
  
  // Track database operations
  trackDbOperation: (operation: string, collection: string) => {
    const startTime = Date.now();
    
    return {
      finish: () => {
        const duration = Date.now() - startTime;
        Sentry.addBreadcrumb({
          message: `DB: ${operation} ${collection}`,
          category: 'db',
          level: 'info',
          data: { duration }
        });
      },
      setTag: (key: string, value: string) => {
        Sentry.setTag(key, value);
      },
      setData: (key: string, value: any) => {
        Sentry.setContext(key, value);
      }
    };
  }
};

// Custom breadcrumbs for better debugging
export const SentryBreadcrumbs = {
  // User action breadcrumbs
  userAction: (action: string, data?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      level: 'info',
      data
    });
  },
  
  // Navigation breadcrumbs
  navigation: (from: string, to: string) => {
    Sentry.addBreadcrumb({
      message: `Navigation: ${from} → ${to}`,
      category: 'navigation',
      level: 'info'
    });
  },
  
  // API call breadcrumbs
  apiCall: (method: string, url: string, status?: number) => {
    Sentry.addBreadcrumb({
      message: `API: ${method} ${url}`,
      category: 'http',
      level: status && status >= 400 ? 'error' : 'info',
      data: { status }
    });
  },
  
  // Firebase operation breadcrumbs
  firebaseOp: (operation: string, collection: string, success: boolean) => {
    Sentry.addBreadcrumb({
      message: `Firebase: ${operation} ${collection}`,
      category: 'firebase',
      level: success ? 'info' : 'error',
      data: { success }
    });
  }
};
