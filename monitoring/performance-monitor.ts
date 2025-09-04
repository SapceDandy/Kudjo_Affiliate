import { SentryPerformance } from './sentry-setup';

// Performance monitoring utilities
// Addresses slow routing and performance issues from memories

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private thresholds = {
    pageLoad: 3000,      // 3 seconds
    apiCall: 1000,       // 1 second
    dbQuery: 500,        // 500ms
    redirect: 2000       // 2 seconds
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track page load performance
  trackPageLoad(pageName: string) {
    const startTime = Date.now();
    const transaction = SentryPerformance.trackPageLoad(pageName);

    return {
      finish: () => {
        const duration = Date.now() - startTime;
        this.metrics.set(`pageLoad_${pageName}`, duration);
        
        if (duration > this.thresholds.pageLoad) {
          this.reportSlowPerformance('slow_page_load', {
            page: pageName,
            duration,
            threshold: this.thresholds.pageLoad
          });
        }
        
        transaction.setData('duration', duration);
        transaction.finish();
      }
    };
  }

  // Track API call performance
  trackApiCall(endpoint: string, method: string) {
    const startTime = Date.now();
    const transaction = SentryPerformance.trackApiCall(endpoint, method);

    return {
      finish: (status?: number) => {
        const duration = Date.now() - startTime;
        this.metrics.set(`api_${method}_${endpoint}`, duration);
        
        if (duration > this.thresholds.apiCall) {
          this.reportSlowPerformance('slow_api', {
            endpoint,
            method,
            duration,
            threshold: this.thresholds.apiCall,
            status
          });
        }
        
        transaction.setData('duration', duration);
        if (status) transaction.setTag('status', status.toString());
        transaction.finish();
      }
    };
  }

  // Track database operations
  trackDbOperation(operation: string, collection: string) {
    const startTime = Date.now();
    const transaction = SentryPerformance.trackDbOperation(operation, collection);

    return {
      finish: () => {
        const duration = Date.now() - startTime;
        this.metrics.set(`db_${operation}_${collection}`, duration);
        
        if (duration > this.thresholds.dbQuery) {
          this.reportSlowPerformance('slow_db_query', {
            operation,
            collection,
            duration,
            threshold: this.thresholds.dbQuery
          });
        }
        
        transaction.setData('duration', duration);
        transaction.finish();
      }
    };
  }

  // Track authentication redirects (addresses slow routing issue)
  trackAuthRedirect(from: string, to: string) {
    const startTime = Date.now();

    return {
      finish: () => {
        const duration = Date.now() - startTime;
        this.metrics.set(`redirect_${from}_to_${to}`, duration);
        
        if (duration > this.thresholds.redirect) {
          this.reportSlowPerformance('slow_redirect', {
            from,
            to,
            duration,
            threshold: this.thresholds.redirect
          });
        }
      }
    };
  }

  // Memory usage monitoring
  trackMemoryUsage() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      
      const usage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };

      // Alert if memory usage is high
      const usagePercent = (usage.used / usage.limit) * 100;
      if (usagePercent > 80) {
        this.reportSlowPerformance('high_memory_usage', {
          usagePercent,
          used: usage.used,
          limit: usage.limit
        });
      }

      return usage;
    }
    return null;
  }

  // Bundle size monitoring
  trackBundleSize() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const jsResources = resources.filter(r => r.name.endsWith('.js'));
      const totalSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      
      // Alert if bundle is too large (> 2MB)
      if (totalSize > 2 * 1024 * 1024) {
        this.reportSlowPerformance('large_bundle_size', {
          totalSize,
          threshold: 2 * 1024 * 1024,
          resourceCount: jsResources.length
        });
      }

      return {
        totalSize,
        resources: jsResources.map(r => ({
          name: r.name,
          size: r.transferSize
        }))
      };
    }
    return null;
  }

  // Real-time update performance monitoring
  trackRealtimeUpdates() {
    const updateCounts = new Map<string, number>();
    const startTime = Date.now();

    return {
      recordUpdate: (type: string) => {
        const count = updateCounts.get(type) || 0;
        updateCounts.set(type, count + 1);
      },
      
      finish: () => {
        const duration = Date.now() - startTime;
        const totalUpdates = Array.from(updateCounts.values()).reduce((sum, count) => sum + count, 0);
        
        // Alert if too many updates in short time (potential polling issue)
        if (totalUpdates > 10 && duration < 5000) {
          this.reportSlowPerformance('excessive_realtime_updates', {
            totalUpdates,
            duration,
            updateTypes: Object.fromEntries(updateCounts)
          });
        }
      }
    };
  }

  // Core Web Vitals monitoring
  trackCoreWebVitals() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      if (lastEntry.startTime > 2500) { // LCP threshold
        this.reportSlowPerformance('poor_lcp', {
          lcp: lastEntry.startTime,
          threshold: 2500
        });
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.processingStart - entry.startTime > 100) { // FID threshold
          this.reportSlowPerformance('poor_fid', {
            fid: entry.processingStart - entry.startTime,
            threshold: 100
          });
        }
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      if (clsValue > 0.1) { // CLS threshold
        this.reportSlowPerformance('poor_cls', {
          cls: clsValue,
          threshold: 0.1
        });
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Get performance metrics summary
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Report slow performance to error tracking
  private reportSlowPerformance(type: string, details: Record<string, any>) {
    import('./error-tracking').then(({ ErrorTracker }) => {
      ErrorTracker.getInstance().trackPerformanceIssue(type as any, details);
    });
  }

  // Clear metrics (for testing)
  clearMetrics() {
    this.metrics.clear();
  }
}

// Utility functions for common performance patterns
export const PerfUtils = {
  // Wrap async functions with performance tracking
  withPerformanceTracking: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string,
    type: 'api' | 'db' | 'page' = 'api'
  ): T => {
    return (async (...args: Parameters<T>) => {
      const monitor = PerformanceMonitor.getInstance();
      
      let tracker;
      switch (type) {
        case 'api':
          tracker = monitor.trackApiCall(name, 'UNKNOWN');
          break;
        case 'db':
          tracker = monitor.trackDbOperation('query', name);
          break;
        case 'page':
          tracker = monitor.trackPageLoad(name);
          break;
      }
      
      try {
        const result = await fn(...args);
        tracker.finish();
        return result;
      } catch (error) {
        tracker.finish();
        throw error;
      }
    }) as T;
  },

  // Debounce function to prevent excessive calls
  debounce: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  },

  // Throttle function to limit call frequency
  throttle: <T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): T => {
    let inThrottle: boolean;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }
};
