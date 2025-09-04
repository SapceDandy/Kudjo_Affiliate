# Vercel Deployment Guide

## Prerequisites

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`
3. Link project: `vercel link`

## Deployment Steps

### 1. Configure Environment Variables

In your Vercel dashboard, add these environment variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kudjo-affiliate.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kudjo-affiliate
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kudjo-affiliate.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=943798260444
NEXT_PUBLIC_FIREBASE_APP_ID=1:943798260444:web:c8c2ce35ee63c639865a19
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-2JNJ612PZT

# Admin Configuration
ADMIN_EMAIL=devon@getkudjo.com
ADMIN_PASSCODE=[your_secure_passcode]
JWT_SECRET=[your_jwt_secret]

# Firebase Admin
FIREBASE_PROJECT_ID=kudjo-affiliate
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@kudjo-affiliate.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=[your_firebase_private_key]

# Production Settings
NEXT_PUBLIC_DEMO=0
DEMO_SEED_ON_BOOT=0
```

### 2. Deploy Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 3. Custom Domain Setup

1. Go to Vercel dashboard → Project → Settings → Domains
2. Add your custom domain (e.g., app.getkudjo.com)
3. Configure DNS records as instructed

### 4. Build Configuration

Create `vercel.json` in project root:

```json
{
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/web/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Post-Deployment Checklist

- [ ] Test admin login at `/control-center`
- [ ] Verify Firebase Auth domains include your Vercel URL
- [ ] Test business and influencer registration flows
- [ ] Confirm all API routes are working
- [ ] Check Firestore security rules are active
- [ ] Verify environment variables are set correctly
