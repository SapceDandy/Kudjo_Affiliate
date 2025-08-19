# Simple Steps to Add Seed Data

Since we're having authentication issues with the scripts, here's the simplest way to add seed data:

## Step 1: Open Firebase Console

Go to [Firebase Console](https://console.firebase.google.com/project/kudjo-affiliate/firestore/data)

## Step 2: Add Admin User

1. Click "Start collection" (or "Add collection" if you already have collections)
2. Enter collection ID: `users`
3. Click "Next"
4. Enter Document ID: `admin_user`
5. Add these fields:
   - `id`: string = `admin_user`
   - `email`: string = `devon@getkudjo.com`
   - `role`: string = `admin`
   - `createdAt`: string = (current date in ISO format, e.g., `2025-08-18T10:00:00.000Z`)
   - `status`: string = `active`
6. Click "Save"

## Step 3: Add Business User

1. In the `users` collection, click "Add document"
2. Enter Document ID: `user_biz_1`
3. Add these fields:
   - `id`: string = `user_biz_1`
   - `email`: string = `mario@restaurant.com`
   - `role`: string = `business`
   - `createdAt`: string = (current date in ISO format)
   - `status`: string = `active`
4. Click "Save"

## Step 4: Add Influencer User

1. In the `users` collection, click "Add document"
2. Enter Document ID: `user_inf_1`
3. Add these fields:
   - `id`: string = `user_inf_1`
   - `email`: string = `sarah@foodie.com`
   - `role`: string = `influencer`
   - `createdAt`: string = (current date in ISO format)
   - `status`: string = `active`
4. Click "Save"

## Step 5: Add Business

1. Click "Start collection" 
2. Enter collection ID: `businesses`
3. Click "Next"
4. Enter Document ID: `biz_1`
5. Add these fields:
   - `id`: string = `biz_1`
   - `name`: string = `Mario's Italian Bistro`
   - `address`: string = `123 Main St, Downtown`
   - `phone`: string = `555-123-4567`
   - `cuisine`: string = `Italian`
   - `posIntegrated`: boolean = `true`
   - `createdAt`: string = (current date in ISO format)
   - `ownerId`: string = `user_biz_1`
   - `status`: string = `active`
6. Click "Save"

## Step 6: Add Influencer

1. Click "Start collection" 
2. Enter collection ID: `influencers`
3. Click "Next"
4. Enter Document ID: `inf_1`
5. Add these fields:
   - `id`: string = `inf_1`
   - `handle`: string = `foodie_explorer`
   - `name`: string = `Sarah Johnson`
   - `followers`: number = `25000`
   - `avgViews`: number = `12000`
   - `tier`: string = `Silver`
   - `createdAt`: string = (current date in ISO format)
   - `ownerId`: string = `user_inf_1`
   - `status`: string = `active`
6. Click "Save"

## Step 7: Add Offer

1. Click "Start collection" 
2. Enter collection ID: `offers`
3. Click "Next"
4. Enter Document ID: `off_1`
5. Add these fields:
   - `id`: string = `off_1`
   - `businessId`: string = `biz_1`
   - `title`: string = `20% Off Italian Dinner`
   - `description`: string = `Get 20% off any dinner entree`
   - `discountPercent`: number = `20`
   - `maxRedemptions`: number = `100`
   - `currentRedemptions`: number = `5`
   - `startDate`: string = (current date in ISO format)
   - `endDate`: string = (current date + 30 days in ISO format)
   - `createdAt`: string = (current date in ISO format)
   - `status`: string = `active`
6. Click "Save"

## Step 8: Add Coupon

1. Click "Start collection" 
2. Enter collection ID: `coupons`
3. Click "Next"
4. Enter Document ID: `AFF-MAR-FOO-ABC123`
5. Add these fields:
   - `id`: string = `AFF-MAR-FOO-ABC123`
   - `type`: string = `AFFILIATE`
   - `businessId`: string = `biz_1`
   - `influencerId`: string = `inf_1`
   - `offerId`: string = `off_1`
   - `createdAt`: string = (current date in ISO format)
   - `deadline`: string = (current date + 30 days in ISO format)
   - `status`: string = `ACTIVE`
   - `posAdded`: boolean = `true`
   - `usageCount`: number = `3`
   - `lastUsedAt`: string = (current date in ISO format)
6. Click "Save"

## Done!

You now have seed data in your Firebase database. You can test your app with this data. 