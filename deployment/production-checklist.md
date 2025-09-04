# Production Deployment Checklist

Based on INSTRUCTIONS.md Section 18 - Checklist (EOD MVP)

## Pre-Deployment Verification

### Core Functionality
- [ ] Admin login works; `/control-center` gated
- [ ] Business onboarding + offer creation works
- [ ] Influencer approval toggled by admin
- [ ] Influencer can **Start Campaign** → sees **affiliate** + **meal** codes
- [ ] Admin can **enter manual redemption**; payout math visible
- [ ] Dashboards show **only** relevant KPIs; **Export PDF/CSV** works
- [ ] Messaging: 1:1 chat functional; announcements render
- [ ] No dead buttons/links; hidden if not implemented

### Environment Configuration
- [ ] All environment variables set in production
- [ ] Firebase project configured for production
- [ ] Admin credentials secured and rotated
- [ ] JWT secrets generated and secured
- [ ] Demo mode disabled (`NEXT_PUBLIC_DEMO=0`)

### Firebase Configuration
- [ ] Firestore security rules deployed
- [ ] Composite indexes created and deployed
- [ ] Firebase Auth authorized domains updated
- [ ] Functions environment variables configured
- [ ] Storage rules configured (if using Firebase Storage)

### Security
- [ ] HTTPS enforced on all routes
- [ ] Admin session cookies are HTTP-only and secure
- [ ] API routes validate authentication properly
- [ ] Sensitive data not exposed in client bundles
- [ ] CORS properly configured

## Deployment Steps

### 1. Build Verification
```bash
npm run build
npm run typecheck
npm run lint
```

### 2. Test Suite
```bash
npm run test:all
```

### 3. Deploy Infrastructure
```bash
# Deploy Firebase rules and indexes first
npm run deploy:rules

# Deploy functions
npm run deploy:functions

# Deploy web app (choose one)
npm run deploy:vercel
# OR
npm run deploy:firebase
```

## Post-Deployment Verification

### Smoke Tests
- [ ] Homepage loads correctly
- [ ] Admin login at `/control-center` works
- [ ] Business registration flow completes
- [ ] Influencer registration flow completes
- [ ] Campaign creation and joining works
- [ ] Manual redemption entry works
- [ ] Messaging system functional
- [ ] PDF/CSV exports work

### Performance
- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] Images optimized and loading properly
- [ ] Bundle size analysis completed

### Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Database query performance acceptable
- [ ] Function execution times within limits

## Production Maintenance

### Daily
- [ ] Monitor error rates
- [ ] Check function execution logs
- [ ] Review database performance metrics

### Weekly
- [ ] Review user feedback and bug reports
- [ ] Analyze usage patterns and performance
- [ ] Update dependencies if needed

### Monthly
- [ ] Rotate admin credentials
- [ ] Review and update security rules
- [ ] Backup critical data
- [ ] Performance optimization review

## Rollback Plan

If issues occur after deployment:

1. **Immediate**: Revert to previous Vercel deployment
2. **Functions**: Rollback Firebase Functions to previous version
3. **Database**: Restore from backup if data corruption occurs
4. **DNS**: Update DNS to point to backup environment

## Support Contacts

- **Firebase Support**: [Firebase Console](https://console.firebase.google.com)
- **Vercel Support**: [Vercel Dashboard](https://vercel.com/dashboard)
- **Domain/DNS**: [Your DNS provider]
- **Monitoring**: [Your monitoring service]
