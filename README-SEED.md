# Kudjo Affiliate Seed Data

This guide explains how to add seed data to your Firebase database.

## Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/kudjo-affiliate/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Save the JSON file as `service-account.json` in the root of your project

## Step 2: Run the Seed Script

```bash
node direct-seed.js
```

That's it! This will add:
- 3 users (1 admin, 1 business, 1 influencer)
- 2 businesses
- 2 influencers
- 1 offer
- 1 coupon

## Troubleshooting

If you see authentication errors, make sure:
1. You've downloaded the service account key correctly
2. The file is named `service-account.json` and is in the project root
3. You have the "Firebase Admin" role in your Firebase project

## Alternative: Manual Data Entry

If you're still having issues, you can manually add data using the Firebase Console:
1. Go to [Firestore Database](https://console.firebase.google.com/project/kudjo-affiliate/firestore/data)
2. Follow the instructions in `MANUAL_SEED.md` to add data directly through the UI 