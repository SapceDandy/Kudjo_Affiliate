# Kudjo Affiliate Testing Guide

This document provides comprehensive instructions for running and maintaining the test suite for the Kudjo Affiliate platform.

## Test Suite Overview

The testing infrastructure includes:

- **Unit Tests**: Core function validation (tier mapping, token generation, validators, fraud rules)
- **Integration Tests**: API route testing with Firebase emulator
- **E2E Tests**: Full user flow testing with Playwright
- **Load Tests**: Performance and concurrency testing
- **CI/CD**: Automated testing pipeline with GitHub Actions

## Prerequisites

### Required Dependencies
```bash
npm install --save-dev @playwright/test playwright @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

### Firebase CLI
```bash
npm install -g firebase-tools
```

### Environment Setup
1. Ensure Firebase emulators are configured in `firebase.json`
2. Install Playwright browsers: `npx playwright install`

## Test Environment Configuration

### Firebase Emulators
- **Auth**: `localhost:9099`
- **Firestore**: `localhost:8080`
- **Functions**: `localhost:5001`
- **UI**: `localhost:4000`

### Test Data
The test suite uses a comprehensive seed dataset:
- 1 admin user
- 2 businesses (manual POS, Square POS)
- 2 influencers (Small tier, Medium tier)
- 2 active offers/campaigns
- Affiliate links and coupons
- Sample redemptions and payouts

## Running Tests

### Quick Start
```bash
# Run all tests
npm run test:all

# Run individual test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Manual Test Execution

#### 1. Start Firebase Emulators
```bash
firebase emulators:start --only auth,firestore,functions
```

#### 2. Seed Test Data
```bash
npm run seed:test
```

#### 3. Run Unit Tests
```bash
jest tests/unit
```

#### 4. Run Integration Tests
```bash
FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 jest tests/integration
```

#### 5. Run E2E Tests
```bash
# Start web server
npm run dev:web

# In another terminal
npx playwright test
```

### Using the Test Runner Script
```bash
node test-runner.js
```

This script automatically:
- Starts Firebase emulators
- Seeds test data
- Runs all test types in sequence
- Cleans up resources

## Test Structure

### Unit Tests (`tests/unit/`)
- **core-functions.test.ts**: Tier mapping, token generation, validation logic
- **fraud-rules.test.ts**: Fraud detection algorithms
- **pos-adapters.test.ts**: POS integration adapters

### Integration Tests (`tests/integration/`)
- **api-auth.test.ts**: Authentication and RBAC validation
- **api-routes.test.ts**: API endpoint functionality
- **firestore-rules.test.ts**: Database security rules

### E2E Tests (`tests/e2e/`)
- **auth.spec.ts**: Sign-in, role routing, session management
- **business-flows.spec.ts**: Business user workflows
- **influencer-flows.spec.ts**: Influencer user workflows
- **admin-flows.spec.ts**: Admin user workflows

### Load Tests (`tests/load/`)
- **performance.test.ts**: Query performance, concurrent operations

## Test Data Management

### Seed Data Structure
```javascript
// Test users
testUsers = {
  admin: { uid: 'test-admin-001', email: 'admin@kudjo.test' },
  business1: { uid: 'test-business-001', email: 'business1@kudjo.test' },
  business2: { uid: 'test-business-002', email: 'business2@kudjo.test' },
  influencer1: { uid: 'test-influencer-001', email: 'influencer1@kudjo.test' },
  influencer2: { uid: 'test-influencer-002', email: 'influencer2@kudjo.test' }
}
```

### Authentication Helpers
```javascript
import { loginAs, loginAsBusiness, loginAsInfluencer, loginAsAdmin } from '../helpers/auth';

// Usage in tests
await loginAsBusiness(page);
await loginAsInfluencer(page);
```

## Test Categories

### A. Authentication & Session (E2E)
- ✅ Sign-in success with valid accounts
- ✅ Role-based access control
- ✅ Session management and sign-out
- ✅ Token refresh and expiration
- ✅ Cross-browser compatibility

### B. Business Flows (E2E)
- ✅ Offer creation, publish, pause workflow
- ✅ POS connection (manual/Square)
- ✅ Analytics dashboard with real data
- ✅ CSV export functionality
- ✅ Pagination and filtering

### C. Influencer Flows (E2E)
- ✅ Offer discovery with filters
- ✅ Affiliate link generation
- ✅ Coupon claiming
- ✅ Content submission
- ✅ Earnings dashboard

### D. Admin Flows (E2E)
- ✅ User management
- ✅ Offer auditing
- ✅ System settings
- ✅ Blacklist management
- ✅ Global metrics

### E. API Integration Tests
- ✅ Authentication & RBAC validation
- ✅ Schema validation
- ✅ Database operations
- ✅ Error handling
- ✅ Rate limiting

### F. Performance Tests
- ✅ Query response times (<300ms)
- ✅ Concurrent operations
- ✅ Load testing
- ✅ Memory usage

## CI/CD Pipeline

### GitHub Actions Workflow
The CI pipeline runs on every push and PR:

1. **Install Dependencies**
2. **Lint Code**
3. **Type Check**
4. **Unit Tests**
5. **Integration Tests** (with emulator)
6. **E2E Tests** (Playwright)
7. **Artifact Upload** (videos, traces)

### Environment Variables
Required in CI:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret
GOOGLE_CLIENT_ID=test-client-id
GOOGLE_CLIENT_SECRET=test-client-secret
```

## Debugging Tests

### Playwright Debug Mode
```bash
npx playwright test --debug
```

### View Test Reports
```bash
npx playwright show-report
```

### Firebase Emulator UI
Visit `http://localhost:4000` when emulators are running

### Test Artifacts
- Screenshots: `test-results/`
- Videos: `test-results/`
- Traces: `test-results/`

## Maintenance

### Updating Test Data
1. Modify `scripts/seed-test.ts`
2. Run `npm run seed:test` to verify
3. Update test assertions if needed

### Adding New Tests
1. Follow existing patterns in respective directories
2. Use helper functions for authentication
3. Include proper cleanup
4. Add to CI pipeline if needed

### Performance Monitoring
- Monitor test execution times
- Update performance thresholds as needed
- Profile slow tests and optimize

## Troubleshooting

### Common Issues

#### Emulator Connection Errors
```bash
# Reset emulator data
firebase emulators:stop
rm -rf .firebase/
firebase emulators:start
```

#### Test Timeouts
- Increase timeout in `playwright.config.ts`
- Check for hanging promises
- Verify cleanup in test teardown

#### Authentication Failures
- Verify emulator is running
- Check test user credentials
- Ensure proper session management

#### TypeScript Errors
- Run `npm run typecheck` to identify issues
- Update type definitions
- Fix import paths

### Getting Help
1. Check test logs and error messages
2. Review Firebase emulator logs
3. Use Playwright trace viewer for E2E issues
4. Consult team documentation

## Best Practices

### Test Writing
- Keep tests focused and atomic
- Use descriptive test names
- Include proper setup/teardown
- Mock external dependencies
- Test both happy path and edge cases

### Data Management
- Use isolated test data
- Clean up after tests
- Avoid test interdependencies
- Use factories for test data creation

### Performance
- Run tests in parallel when possible
- Use appropriate timeouts
- Monitor resource usage
- Optimize slow tests

### Maintenance
- Regular dependency updates
- Monitor test flakiness
- Update documentation
- Review and refactor tests periodically
