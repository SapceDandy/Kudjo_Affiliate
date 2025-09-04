import { initSentry, SentryBreadcrumbs, SentryPerformance } from './sentry-setup';

// Error tracking utilities for production monitoring
// Addresses critical production issues from memories

export class ErrorTracker {
  private static instance: ErrorTracker;
  private isInitialized = false;

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  initialize() {
    if (this.isInitialized) return;
    
    initSentry();
    this.setupGlobalErrorHandlers();
    this.setupUnhandledRejectionHandler();
    this.setupConsoleErrorCapture();
    
    this.isInitialized = true;
  }

  // Global error handlers
  private setupGlobalErrorHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError(event.error, {
          type: 'javascript_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(event.reason, {
          type: 'unhandled_promise_rejection'
        });
      });
    }
  }

  private setupUnhandledRejectionHandler() {
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        this.captureError(reason, {
          type: 'node_unhandled_rejection',
          promise: promise.toString()
        });
      });
    }
  }

  private setupConsoleErrorCapture() {
    if (typeof console !== 'undefined') {
      const originalError = console.error;
      console.error = (...args) => {
        // Call original console.error
        originalError.apply(console, args);
        
        // Capture console errors that might indicate issues
        const message = args.join(' ');
        if (this.shouldCaptureConsoleError(message)) {
          this.captureError(new Error(message), {
            type: 'console_error',
            args: args.map(arg => String(arg))
          });
        }
      };
    }
  }

  private shouldCaptureConsoleError(message: string): boolean {
    // Capture specific error patterns that indicate production issues
    const criticalPatterns = [
      'Failed to fetch',
      'Network request failed',
      'Firebase: Error',
      'Uncaught',
      'Permission denied',
      'Quota exceeded',
      'Internal server error'
    ];

    return criticalPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Capture errors with context
  captureError(error: any, context?: Record<string, any>) {
    if (!this.isInitialized) {
      console.error('ErrorTracker not initialized:', error);
      return;
    }

    try {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Add context as tags
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          SentryBreadcrumbs.userAction(`error_context_${key}`, { value });
        });
      }

      // Capture with Sentry
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureException(errorObj, {
          tags: context,
          level: 'error'
        });
      });

    } catch (captureError) {
      console.error('Failed to capture error:', captureError);
    }
  }

  // API error tracking
  trackApiError(endpoint: string, method: string, status: number, error: any) {
    SentryBreadcrumbs.apiCall(method, endpoint, status);
    
    this.captureError(error, {
      api_endpoint: endpoint,
      api_method: method,
      api_status: status.toString(),
      error_type: 'api_error'
    });
  }

  // Authentication error tracking
  trackAuthError(type: 'login' | 'token_validation' | 'permission_denied', error: any, userId?: string) {
    SentryBreadcrumbs.userAction(`auth_error_${type}`, { userId });
    
    this.captureError(error, {
      auth_error_type: type,
      user_id: userId,
      error_type: 'auth_error'
    });
  }

  // Firebase error tracking
  trackFirebaseError(operation: string, collection: string, error: any) {
    SentryBreadcrumbs.firebaseOp(operation, collection, false);
    
    this.captureError(error, {
      firebase_operation: operation,
      firebase_collection: collection,
      error_type: 'firebase_error'
    });
  }

  // Performance issue tracking
  trackPerformanceIssue(type: 'slow_api' | 'slow_page_load' | 'memory_leak', details: Record<string, any>) {
    const error = new Error(`Performance issue: ${type}`);
    
    this.captureError(error, {
      performance_issue_type: type,
      error_type: 'performance_issue',
      ...details
    });
  }

  // User feedback integration
  showUserFeedbackDialog(error?: Error) {
    if (typeof window === 'undefined') return;
    
    import('@sentry/nextjs').then(Sentry => {
      Sentry.showReportDialog({
        title: 'Something went wrong',
        subtitle: 'Help us improve by reporting this issue',
        subtitle2: 'Your feedback helps us fix bugs faster.',
        labelName: 'Name',
        labelEmail: 'Email',
        labelComments: 'What happened?',
        labelClose: 'Close',
        labelSubmit: 'Submit Report',
        errorGeneric: 'An error occurred while submitting your report. Please try again.',
        errorFormEntry: 'Please check your entries and try again.',
        successMessage: 'Thank you for your report!'
      });
    });
  }
}

// Specific error handlers for common production issues
export class ProductionErrorHandlers {
  static handleJsonParseError(response: Response, endpoint: string) {
    const error = new Error(`Invalid JSON response from ${endpoint}`);
    ErrorTracker.getInstance().trackApiError(endpoint, 'GET', response.status, error);
    
    // Return user-friendly error
    return {
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Server returned invalid data. Please try again.'
      }
    };
  }

  static handleFirebasePermissionError(operation: string, collection: string, error: any) {
    ErrorTracker.getInstance().trackFirebaseError(operation, collection, error);
    
    // Return user-friendly error
    return {
      error: {
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action.'
      }
    };
  }

  static handleNetworkError(endpoint: string, error: any) {
    ErrorTracker.getInstance().trackApiError(endpoint, 'UNKNOWN', 0, error);
    
    // Return user-friendly error
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection and try again.'
      }
    };
  }

  static handleAuthenticationError(type: 'login' | 'token_validation' | 'permission_denied', error: any) {
    ErrorTracker.getInstance().trackAuthError(type, error);
    
    // Return user-friendly error
    const messages = {
      login: 'Login failed. Please check your credentials and try again.',
      token_validation: 'Your session has expired. Please log in again.',
      permission_denied: 'You do not have permission to access this resource.'
    };
    
    return {
      error: {
        code: 'AUTH_ERROR',
        message: messages[type]
      }
    };
  }
}

// Initialize error tracking on import
if (typeof window !== 'undefined' || typeof process !== 'undefined') {
  ErrorTracker.getInstance().initialize();
}
