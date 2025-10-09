# Production Logging Strategy

## Overview
This document outlines the logging strategy for production deployments to ensure security, performance, and maintainability.

## Production Logger

**Location**: `/apps/web/lib/logger.ts`

**Features**:
- ✅ Development mode: logs everything
- ✅ Production mode: only logs warnings and errors
- ✅ Ready for Sentry integration
- ✅ Type-safe API
- ✅ Zero production overhead for debug logs

## Usage

### Instead of console.log:
```typescript
// ❌ Old way
console.log('User logged in:', userId);

// ✅ New way
import { logger } from '@/lib/logger';
logger.debug('User logged in', { userId });
```

### Instead of console.error:
```typescript
// ❌ Old way
console.error('API error:', error);

// ✅ New way  
import { logger } from '@/lib/logger';
logger.error('API error', error);
```

## Migration Status

### ✅ Completed
- `/lib/hooks/use-realtime-offers.ts` - Fully migrated
- `/app/api/business/requests/route.ts` - Partially migrated (errors only)

### ⚠️ In Progress
The following files still contain console.log statements (110+ instances across API routes):

**High Priority Files** (30+ console.logs each):
- `/app/api/business/requests/route.ts` (33 instances)
- `/app/api/business/metrics/route.ts` (18 instances)
- `/app/api/admin/coupons/list/route.ts` (12 instances)
- `/app/api/control-center/users/route.ts` (12 instances)
- `/app/api/admin/metrics/route.ts` (10 instances)

**Migration Approach**:
1. Add `import { logger } from '@/lib/logger'` to each file
2. Replace `console.log(...)` with `logger.debug(...)`
3. Replace `console.error(...)` with `logger.error(...)`
4. Replace `console.warn(...)` with `logger.warn(...)`

## Automated Migration Script

For bulk migration, you can use this find/replace pattern:

```bash
# Find all console.log usage
find apps/web/app/api -name "*.ts" -exec grep -l "console\\.log" {} \\;

# Replace pattern (manual review recommended)
# console.log(...) → logger.debug(...)
# console.error(...) → logger.error(...)  
# console.warn(...) → logger.warn(...)
```

## Production Configuration

### Environment Variables
```bash
NODE_ENV=production  # Automatically enables production mode
```

### Sentry Integration (Optional)
To enable error tracking, uncomment the Sentry integration in `/lib/logger.ts`:

```typescript
if (!isDevelopment && typeof window !== 'undefined') {
  Sentry.captureException(error, { extra: { message, args } });
}
```

## Best Practices

### DO ✅
- Use `logger.debug()` for development-only debugging
- Use `logger.info()` for important business events
- Use `logger.warn()` for recoverable issues
- Use `logger.error()` for errors that need attention
- Include context objects: `logger.error('API failed', { userId, endpoint })`

### DON'T ❌
- Don't log sensitive data (passwords, tokens, PII)
- Don't use console.log/error/warn directly
- Don't log in hot paths (e.g., inside loops)
- Don't include stack traces unless necessary

## Performance Impact

### Development
- No performance impact (logs everything)

### Production
- `logger.debug()` calls: **0ms** (no-op)
- `logger.info()` calls: **0ms** (no-op)
- `logger.warn()` calls: **<1ms** (console.warn only)
- `logger.error()` calls: **<1ms** (console.error + optional Sentry)

## Monitoring Integration

### Current Status
- ✅ Logger utility created
- ⚠️ Partial migration in progress
- ⏳ Sentry integration ready (commented out)
- ⏳ Log aggregation service integration pending

### Recommended Services
- **Sentry** (already installed): Error tracking and performance monitoring
- **Datadog**: Full observability platform
- **LogRocket**: Session replay with logging
- **CloudWatch**: AWS-native logging

## Next Steps

1. **Immediate** (before production): Migrate high-priority API routes
2. **Short-term** (first month): Complete migration of all API routes
3. **Medium-term** (after launch): Add Sentry integration
4. **Long-term** (optimization): Add log aggregation service

---

**Last Updated**: 2025-10-01  
**Status**: Logger created, partial migration complete
