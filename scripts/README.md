# Kudjo Affiliate - Database Seeding

This directory contains scripts for seeding the Firebase Firestore database with initial test data.

## Setup

1. **Generate a Firebase Service Account Key**:
   - Go to [Firebase Console](https://console.firebase.google.com/project/kudjo-affiliate/settings/serviceaccounts/adminsdk)
   - Click "Generate new private key"
   - Save the downloaded JSON file as `firebase-service-account.json` in this directory

2. **Install Dependencies**:
   ```bash
   npm install firebase-admin uuid
   ```

## Running the Seed Script

To populate your Firebase database with test data:

```bash
node scripts/seed-data.js
```

## What Gets Created

The seed script creates:

- **Users**: 5 users (1 admin, 2 business owners, 2 influencers)
- **Businesses**: 2 businesses with details
- **Influencers**: 2 influencers with metrics
- **Offers**: 2 offers from businesses
- **Coupons**: 2 coupons (1 AFFILIATE, 1 CONTENT_MEAL)
- **Redemptions**: 1 sample redemption record
- **Daily Stats**: 1 sample daily stats record for charts

## Customizing the Seed Data

You can modify the `seed-data.js` file to add more data or change the existing data to suit your testing needs.

## Troubleshooting

- **Authentication Errors**: Make sure your service account key is correctly placed in the `scripts` directory and has the proper permissions.
- **Permission Errors**: Ensure your service account has the "Firebase Admin" role in your Firebase project.
- **Missing Dependencies**: Run `npm install firebase-admin uuid` to install required packages. 