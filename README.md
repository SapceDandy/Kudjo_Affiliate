# Kudjo Affiliate & Content Coupon MVP

Monorepo for the MVP: creators claim single-use content coupons, generate affiliate links/QRs, and earn on tracked redemptions. Businesses onboard and configure splits; Admin runs outreach via Outlook.

## Stack
- Frontend: Next.js 14 (App Router), Tailwind, shadcn/ui (opt-in later), React Query
- Backend: Firebase (Auth, Firestore, Storage, Functions, Scheduler), Cloud Tasks (future), Secret Manager
- POS: Square (OAuth, discounts, payments webhooks); Clover stub; Manual Mode fallback
- Outreach: Microsoft Graph OAuth
- Types/Validation: TypeScript, Zod

## Monorepo Layout
- `apps/web` — Next.js app (dashboards and flows)
- `functions` — Firebase Cloud Functions (Node 20, TypeScript)
- `packages/shared` — Shared types, Zod schemas, and utils
- `.github/workflows` — CI pipeline

## Environment
Create `apps/web/.env.local` from this sample:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_MAPS_API_KEY=...
```
Functions use Secret Manager where possible. For local dev, export env vars as needed:
```
SQUARE_APP_ID=...
SQUARE_APP_SECRET=...
MS_GRAPH_CLIENT_ID=...
MS_GRAPH_CLIENT_SECRET=...
JWT_SIGNING_KEY=dev_only
PUBLIC_URL=http://localhost:3000
```

## Setup
1. Install deps
```
npm ci
```
2. Firebase emulators
```
npx firebase emulators:start
```
3. Web (dev)
```
npm run dev:web
```
4. Functions (watch build)
```
npm run dev:functions
```

## Tests
- Unit tests
```
npm run test
```
- Emulator tests
```
npx firebase emulators:exec --only firestore,auth "npm --workspace functions run test:emu"
```

## Seed Data
```
npm run seed
```
Seeds: 1 admin, 2 businesses (one Square-connected mock), 3 offers, 3 influencers, 2 coupons, 2 affiliate links, 1 outreach campaign with 5 recipients.

## Deploy
- Configure Firebase project in `.firebaserc`
- Build and deploy functions/hosting
```
npm run build:functions
npx firebase deploy --only functions,hosting
```

## Security Rules (MVP)
- Users: own doc readable; Admin read all
- Businesses: public read (limited fields enforced in UI), writes via CF
- Offers: public read when `status=active`, writes via CF
- Coupons/Links: read by owning influencer/business/admin; create/redeem via CF only
- Redemptions: business owner reads; influencer reads own attributed
- Admin collections: admin-only

## Known Limitations
- Toast is pending; Clover is stubbed
- Fraud rules are minimal (hashing + allow/review/block scaffold)
- Square Catalog/Discounts are stubbed; webhook attribution uses payment.note as offerRef (MVP simplification)
- Map display is stubbed (list only)

## Security Notes
- Never store raw PAN; card hashing uses SHA-256 over a salt
- Manual Mode requires cashier consent; include in ToS
- Enforce single-use coupons via CF; second redemption must block (to be strengthened) 