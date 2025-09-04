# Monitoring & Error Tracking Setup

This directory contains comprehensive monitoring and error tracking solutions for the Kudjo Affiliate platform, addressing critical production issues identified in previous deployments.

## Components

### 1. Sentry Integration (`sentry-setup.ts`)
- **Error Monitoring**: Captures JavaScript errors, API failures, and unhandled exceptions
- **Performance Tracking**: Monitors page load times, API response times, and database queries
- **Session Replay**: Records user sessions for debugging critical issues
- **Custom Error Boundaries**: React components with fallback UI for graceful error handling

### 2. Error Tracking (`error-tracking.ts`)
- **Global Error Handlers**: Captures unhandled errors and promise rejections
- **API Error Tracking**: Monitors API failures and JSON parsing errors
- **Firebase Error Handling**: Tracks permission errors and quota issues
- **User Feedback Integration**: Allows users to report issues directly

### 3. Performance Monitoring (`performance-monitor.ts`)
- **Page Load Tracking**: Monitors homepage redirects and dashboard loading times
- **API Performance**: Tracks response times and identifies slow endpoints
- **Memory Usage**: Detects memory leaks and excessive resource consumption
- **Core Web Vitals**: Monitors LCP, FID, and CLS metrics
- **Bundle Size Monitoring**: Alerts when JavaScript bundles exceed thresholds

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @sentry/nextjs
```

### 2. Environment Variables
Add to your `.env.local`:
```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=kudjo-affiliate
```

### 3. Next.js Configuration
The following files are automatically configured:
- `apps/web/instrumentation.ts` - Server-side initialization
- `apps/web/sentry.client.config.ts` - Client-side configuration
- `apps/web/sentry.server.config.ts` - Server-side configuration

### 4. Webpack Configuration
Add to your `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing config
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
```

## Usage Examples

### Error Boundary Wrapper
```typescript
import { withSentryErrorBoundary } from '../../../monitoring/sentry-setup';

const MyComponent = () => {
  return <div>My component content</div>;
};

export default withSentryErrorBoundary(MyComponent);
```

### API Error Handling
```typescript
import { ProductionErrorHandlers } from '../../../monitoring/error-tracking';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      return ProductionErrorHandlers.handleNetworkError('/api/data', new Error('API failed'));
    }
    return response.json();
  } catch (error) {
    return ProductionErrorHandlers.handleJsonParseError(response, '/api/data');
  }
}
```

### Performance Tracking
```typescript
import { PerformanceMonitor } from '../../../monitoring/performance-monitor';

export default function Dashboard() {
  useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    const tracker = monitor.trackPageLoad('Dashboard');
    
    return () => tracker.finish();
  }, []);
  
  return <div>Dashboard content</div>;
}
```

## Key Features Addressing Production Issues

### 1. JSON Parsing Error Prevention
- Automatically detects HTML responses from API routes
- Provides user-friendly error messages instead of raw JSON parsing errors
- Tracks API failures for debugging

### 2. Firebase Permission Error Handling
- Graceful handling of "Missing or insufficient permissions" errors
- Automatic retry logic for transient failures
- User-friendly error messages

### 3. Performance Issue Detection
- Monitors homepage redirect speed (< 2 seconds)
- Tracks API response times (< 1 second)
- Detects memory leaks and excessive resource usage
- Alerts on bundle size issues (> 2MB)

### 4. Real-time Update Monitoring
- Tracks excessive polling or real-time updates
- Prevents performance degradation from too many listeners
- Monitors Firestore onSnapshot usage

## Dashboard and Alerts

### Sentry Dashboard
- Error frequency and trends
- Performance metrics and regressions
- User impact analysis
- Release health monitoring

### Custom Alerts
- API response time > 1 second
- Page load time > 3 seconds
- Error rate > 1% of requests
- Memory usage > 80% of limit

## Best Practices

1. **Error Context**: Always include relevant context when capturing errors
2. **Performance Budgets**: Set and monitor performance thresholds
3. **User Feedback**: Enable user feedback for critical errors
4. **Release Tracking**: Tag errors with release versions
5. **Privacy**: Filter out sensitive data from error reports

## Troubleshooting

### Common Issues
1. **Sentry not capturing errors**: Check DSN configuration and network connectivity
2. **Performance data missing**: Ensure tracing is enabled and sample rate is appropriate
3. **Too many alerts**: Adjust thresholds and filter out known issues

### Debug Mode
Set `NODE_ENV=development` to see detailed error information and disable certain filters.

## Integration with Existing Code

The monitoring system is designed to integrate seamlessly with the existing Kudjo Affiliate codebase:

- **API Routes**: Wrap handlers with error tracking
- **React Components**: Use error boundaries for graceful degradation
- **Firebase Operations**: Track permission errors and performance
- **Authentication**: Monitor login failures and token validation issues

This monitoring setup provides comprehensive visibility into production issues and helps maintain a stable, performant user experience.
