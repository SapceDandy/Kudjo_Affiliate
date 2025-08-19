# Testing TODO & Specifications

## Overview

This document outlines the testing requirements and specifications for the Kudjo Affiliate repository. The goal is to achieve >80% test coverage across all packages with comprehensive testing of critical user flows and security features.

## Current Test Status

### Web App (`apps/web`)
- **Total Test Files**: 6
- **Coverage**: ~40% (estimated)
- **Status**: Partially broken due to Jest configuration issues

### Functions (`functions`)
- **Total Test Files**: 3
- **Coverage**: ~30% (estimated)
- **Status**: Basic API testing, needs expansion

### Shared Package (`packages/shared`)
- **Total Test Files**: 0
- **Coverage**: 0%
- **Status**: No tests implemented

## Test Specifications by Package

### 1. Web App Tests (`apps/web`)

#### Authentication & Authorization
```typescript
// lib/auth.test.tsx
describe('AuthProvider', () => {
  it('should provide authentication context', () => {});
  it('should handle sign in flow', () => {});
  it('should handle sign out flow', () => {});
  it('should manage loading states', () => {});
  it('should handle auth state changes', () => {});
});

// lib/role-guard.test.tsx
describe('RoleGuard', () => {
  it('should redirect unauthenticated users', () => {});
  it('should enforce role-based access', () => {});
  it('should handle admin role correctly', () => {});
  it('should show loading state', () => {});
});
```

#### Business Onboarding Flow
```typescript
// app/business/onboard/__tests__/basic-info-form.test.tsx
describe('BasicInfoForm', () => {
  it('should validate required fields', () => {});
  it('should handle form submission', () => {});
  it('should show validation errors', () => {});
  it('should call onNext with valid data', () => {});
});

// app/business/onboard/__tests__/pos-selection-form.test.tsx
describe('PosSelectionForm', () => {
  it('should display all POS options', () => {});
  it('should handle provider selection', () => {});
  it('should call onNext with selected provider', () => {});
  it('should highlight selected provider', () => {});
});

// app/business/onboard/__tests__/pos-setup-form.test.tsx
describe('PosSetupForm', () => {
  it('should show Square setup for Square provider', () => {});
  it('should show manual setup for manual provider', () => {});
  it('should handle Square OAuth flow', () => {});
  it('should handle manual mode enablement', () => {});
  it('should show error states', () => {});
});
```

#### Influencer Dashboard
```typescript
// app/influencer/__tests__/page.test.tsx
describe('InfluencerPage', () => {
  it('should display nearby offers', () => {});
  it('should handle geolocation errors', () => {});
  it('should show loading states', () => {});
  it('should handle offer claiming', () => {});
  it('should filter offers by distance', () => {});
});

// app/influencer/__tests__/claim-offer-dialog.test.tsx
describe('ClaimOfferDialog', () => {
  it('should display offer details', () => {});
  it('should handle coupon generation', () => {});
  it('should show QR code', () => {});
  it('should handle errors gracefully', () => {});
});
```

#### Business Dashboard
```typescript
// app/business/offers/__tests__/create-offer-dialog.test.tsx
describe('CreateOfferDialog', () => {
  it('should validate form inputs', () => {});
  it('should handle API submission', () => {});
  it('should show loading states', () => {});
  it('should handle errors', () => {});
  it('should close on success', () => {});
});

// app/business/offers/__tests__/edit-offer-dialog.test.tsx
describe('EditOfferDialog', () => {
  it('should populate with existing data', () => {});
  it('should handle updates', () => {});
  it('should validate changes', () => {});
  it('should handle API errors', () => {});
});
```

#### UI Components
```typescript
// components/ui/__tests__/button.test.tsx
describe('Button', () => {
  it('should render with default props', () => {});
  it('should apply variant styles', () => {});
  it('should apply size styles', () => {});
  it('should handle disabled state', () => {});
  it('should forward refs', () => {});
});

// components/ui/__tests__/dialog.test.tsx
describe('Dialog', () => {
  it('should show/hide based on open prop', () => {});
  it('should handle escape key', () => {});
  it('should handle backdrop clicks', () => {});
  it('should focus trap content', () => {});
});

// components/ui/__tests__/loading.test.tsx
describe('Loading', () => {
  it('should display spinner', () => {});
  it('should show custom text', () => {});
  it('should use default text', () => {});
  it('should be accessible', () => {});
});
```

#### Hooks
```typescript
// lib/hooks/__tests__/use-nearby-offers.test.ts
describe('useNearbyOffers', () => {
  it('should fetch offers on mount', () => {});
  it('should handle geolocation success', () => {});
  it('should handle geolocation errors', () => {});
  it('should filter offers by distance', () => {});
  it('should sort offers by distance', () => {});
  it('should handle API errors', () => {});
  it('should manage loading states', () => {});
});

// lib/hooks/__tests__/use-offers.test.ts
describe('useOffers', () => {
  it('should fetch business offers', () => {});
  it('should handle offer creation', () => {});
  it('should handle offer updates', () => {});
  it('should handle offer deletion', () => {});
});
```

### 2. Functions Tests (`functions`)

#### API Handlers
```typescript
// tests/api.handlers.test.ts
describe('Business API', () => {
  it('should create business with valid data', () => {});
  it('should validate required fields', () => {});
  it('should handle POS connection', () => {});
  it('should enforce business role access', () => {});
});

describe('Offer API', () => {
  it('should create offer with valid data', () => {});
  it('should validate offer parameters', () => {});
  it('should enforce business ownership', () => {});
  it('should generate unique codes', () => {});
});

describe('Coupon API', () => {
  it('should claim coupon successfully', () => {});
  it('should validate offer existence', () => {});
  it('should generate QR codes', () => {});
  it('should enforce influencer access', () => {});
});

describe('Admin API', () => {
  it('should enforce admin role access', () => {});
  it('should handle outreach operations', () => {});
  it('should validate campaign data', () => {});
});
```

#### Authentication & Authorization
```typescript
// tests/auth.test.ts
describe('Authentication', () => {
  it('should verify Firebase ID tokens', () => {});
  it('should extract user claims', () => {});
  it('should handle invalid tokens', () => {});
  it('should handle expired tokens', () => {});
});

// tests/roles.test.ts
describe('Role Management', () => {
  it('should enforce role requirements', () => {});
  it('should handle missing roles', () => {});
  it('should validate role permissions', () => {});
});
```

#### Fraud Detection
```typescript
// tests/fraud.rules.test.ts
describe('Fraud Detection', () => {
  it('should compute card hashes correctly', () => {});
  it('should evaluate redemption events', () => {});
  it('should flag suspicious transactions', () => {});
  it('should handle missing data gracefully', () => {});
});
```

#### Integration Tests
```typescript
// tests/integrations/square.test.ts
describe('Square Integration', () => {
  it('should handle OAuth flow', () => {});
  it('should process webhooks', () => {});
  it('should validate webhook signatures', () => {});
  it('should handle API errors', () => {});
});

// tests/integrations/clover.test.ts
describe('Clover Integration', () => {
  it('should handle stub operations', () => {});
  it('should return expected mock data', () => {});
});
```

### 3. Shared Package Tests (`packages/shared`)

#### Type Validation
```typescript
// tests/schemas.test.ts
describe('Zod Schemas', () => {
  it('should validate UserDoc', () => {});
  it('should validate BusinessDoc', () => {});
  it('should validate OfferDoc', () => {});
  it('should validate ContentCouponDoc', () => {});
  it('should validate AffiliateLinkDoc', () => {});
  it('should validate RedemptionDoc', () => {});
});

// tests/utils.test.ts
describe('Utility Functions', () => {
  it('should format dates correctly', () => {});
  it('should validate email formats', () => {});
  it('should handle edge cases', () => {});
});
```

## Test Coverage Requirements

### Minimum Coverage Targets
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Critical Path Coverage
- **Authentication Flow**: 100%
- **Business Onboarding**: 100%
- **Offer Creation**: 100%
- **Coupon Claiming**: 100%
- **Payment Processing**: 100%
- **Admin Operations**: 100%

## Test Environment Setup

### Web App Testing
```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
}));

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
  },
});
```

### Functions Testing
```typescript
// tests/setup.ts
import admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    initializeApp: jest.fn(),
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
    firestore: jest.fn(() => ({
      collection: jest.fn(),
      doc: jest.fn(),
    })),
  },
}));

// Mock environment variables
process.env.PUBLIC_URL = 'http://localhost:3000';
process.env.JWT_SIGNING_KEY = 'test-key';
```

## Performance Testing

### Load Testing
- **API Endpoints**: 100 concurrent users
- **Database Queries**: 1000 concurrent operations
- **File Uploads**: 10MB files, 50 concurrent
- **Authentication**: 500 concurrent logins

### Stress Testing
- **Memory Usage**: Monitor for leaks
- **CPU Usage**: Stay under 80% under load
- **Response Times**: <2s for 95th percentile
- **Error Rates**: <1% under normal load

## Security Testing

### Authentication Tests
- **Token Validation**: Test expired/invalid tokens
- **Role Enforcement**: Test unauthorized access
- **Session Management**: Test session hijacking
- **Password Security**: Test brute force protection

### Input Validation Tests
- **SQL Injection**: Test malicious inputs
- **XSS Protection**: Test script injection
- **CSRF Protection**: Test cross-site requests
- **File Upload Security**: Test malicious files

### Authorization Tests
- **Resource Access**: Test cross-user access
- **Admin Privileges**: Test privilege escalation
- **API Rate Limiting**: Test abuse scenarios
- **Data Leakage**: Test information disclosure

## Accessibility Testing

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and roles
- **Color Contrast**: 4.5:1 minimum ratio
- **Focus Management**: Visible focus indicators
- **Error Handling**: Clear error messages

### Component Testing
- **Button States**: Loading, disabled, active
- **Form Validation**: Clear error indicators
- **Modal Dialogs**: Focus trapping, escape handling
- **Navigation**: Breadcrumbs, skip links

## Test Data Management

### Seed Data
```typescript
// scripts/seed.ts
export const testUsers = [
  { email: 'admin@test.com', role: 'admin' },
  { email: 'business@test.com', role: 'business' },
  { email: 'influencer@test.com', role: 'influencer' },
];

export const testBusinesses = [
  { name: 'Test Restaurant', posProvider: 'square' },
  { name: 'Test Store', posProvider: 'manual' },
];

export const testOffers = [
  { title: 'Test Offer 1', splitPct: 20 },
  { title: 'Test Offer 2', splitPct: 15 },
];
```

### Test Utilities
```typescript
// lib/test-utils.tsx
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </AuthProvider>
  );
};

export const mockFirebaseUser = (overrides = {}) => ({
  uid: 'test-uid',
  email: 'test@example.com',
  ...overrides,
});
```

## Continuous Integration

### Pre-commit Hooks
- **Type Checking**: `npm run typecheck`
- **Linting**: `npm run lint`
- **Unit Tests**: `npm run test:unit`
- **Formatting**: `prettier --check`

### CI Pipeline
- **Build Verification**: All packages build successfully
- **Test Execution**: All tests pass with coverage
- **Security Scan**: Dependency vulnerability check
- **Performance Test**: Lighthouse score validation

## Monitoring & Reporting

### Test Metrics
- **Execution Time**: Track test suite performance
- **Coverage Trends**: Monitor coverage over time
- **Flaky Tests**: Identify and fix unstable tests
- **Test Debt**: Track technical debt in tests

### Quality Gates
- **Coverage Threshold**: Fail if <80%
- **Test Failures**: Zero tolerance for failures
- **Performance Regression**: Alert on significant changes
- **Security Issues**: Immediate failure on vulnerabilities

This testing plan ensures comprehensive coverage of all critical functionality while maintaining high code quality and security standards. 