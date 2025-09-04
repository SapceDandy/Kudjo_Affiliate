# Environment Variables Template

## Next.js (.env.local)

```bash
# Firebase Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kudjo-affiliate.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kudjo-affiliate
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kudjo-affiliate.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=943798260444
NEXT_PUBLIC_FIREBASE_APP_ID=1:943798260444:web:c8c2ce35ee63c639865a19
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-2JNJ612PZT

# Admin Configuration
ADMIN_EMAIL=devon@getkudjo.com
ADMIN_PASSCODE=your_secure_passcode_here
JWT_SECRET=your_jwt_secret_here

# Firebase Admin SDK
FIREBASE_PROJECT_ID=kudjo-affiliate
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@kudjo-affiliate.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[Your Firebase Admin SDK Private Key]
-----END PRIVATE KEY-----"

# Production Settings
NEXT_PUBLIC_DEMO=0
DEMO_SEED_ON_BOOT=0
NODE_ENV=production
```

## Firebase Functions (.env)

```bash
# Core Configuration
FIREBASE_PROJECT_ID=kudjo-affiliate
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAIL=devon@getkudjo.com
ADMIN_PASSCODE=your_secure_passcode_here

# Optional POS Integrations
SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_APPLICATION_SECRET=your_square_secret
SQUARE_WEBHOOK_SIGNATURE_KEY=your_square_webhook_key

# Optional Third-party Services
SENDGRID_API_KEY=your_sendgrid_key
STRIPE_SECRET_KEY=your_stripe_key
```

## Vercel Environment Variables

Set these in your Vercel project dashboard:

### Production Variables
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `ADMIN_EMAIL`
- `ADMIN_PASSCODE`
- `JWT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Feature Flags
- `NEXT_PUBLIC_DEMO=0`
- `DEMO_SEED_ON_BOOT=0`

## Security Notes

1. **Never commit secrets** - All sensitive values should be set in hosting platform
2. **Use strong passwords** - Generate secure admin passcode and JWT secret
3. **Rotate keys regularly** - Update Firebase keys and admin credentials periodically
4. **Environment separation** - Use different Firebase projects for dev/staging/prod
5. **HTTPS only** - Ensure all production deployments use HTTPS
