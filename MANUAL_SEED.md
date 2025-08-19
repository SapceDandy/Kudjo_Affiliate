# Quick Manual Seed Data

Since the authentication is giving us trouble, here's how to manually add seed data in 5 minutes:

## 1. Open Firebase Console
Go to: https://console.firebase.google.com/project/kudjo-affiliate/firestore

## 2. Create Collections

### Collection: `users`
**Document ID: `admin_user`**
```json
{
  "id": "admin_user",
  "email": "devon@getkudjo.com", 
  "role": "admin",
  "createdAt": "2025-08-18T09:00:00.000Z",
  "status": "active"
}
```

**Document ID: `user_biz_1`**
```json
{
  "id": "user_biz_1",
  "email": "mario@restaurant.com",
  "role": "business", 
  "createdAt": "2025-08-18T09:00:00.000Z",
  "status": "active"
}
```

**Document ID: `user_inf_1`**
```json
{
  "id": "user_inf_1",
  "email": "sarah@foodie.com",
  "role": "influencer",
  "createdAt": "2025-08-18T09:00:00.000Z", 
  "status": "active"
}
```

### Collection: `businesses`
**Document ID: `biz_1`**
```json
{
  "id": "biz_1",
  "name": "Mario's Italian Bistro",
  "address": "123 Main St, Downtown",
  "phone": "555-123-4567",
  "cuisine": "Italian",
  "posIntegrated": true,
  "createdAt": "2025-08-18T09:00:00.000Z",
  "ownerId": "user_biz_1",
  "status": "active"
}
```

**Document ID: `biz_2`**
```json
{
  "id": "biz_2",
  "name": "Taco Express", 
  "address": "456 Oak Ave, Midtown",
  "phone": "555-234-5678",
  "cuisine": "Mexican",
  "posIntegrated": false,
  "createdAt": "2025-08-18T09:00:00.000Z",
  "ownerId": "user_biz_2", 
  "status": "active"
}
```

### Collection: `influencers`
**Document ID: `inf_1`**
```json
{
  "id": "inf_1",
  "handle": "foodie_explorer",
  "name": "Sarah Johnson",
  "followers": 25000,
  "avgViews": 12000,
  "tier": "Silver",
  "createdAt": "2025-08-18T09:00:00.000Z",
  "ownerId": "user_inf_1",
  "status": "active"
}
```

**Document ID: `inf_2`**
```json
{
  "id": "inf_2",
  "handle": "taste_tester", 
  "name": "Mike Chen",
  "followers": 85000,
  "avgViews": 35000,
  "tier": "Gold",
  "createdAt": "2025-08-18T09:00:00.000Z",
  "ownerId": "user_inf_2",
  "status": "active"
}
```

### Collection: `offers`
**Document ID: `off_1`**
```json
{
  "id": "off_1",
  "businessId": "biz_1",
  "title": "20% Off Italian Dinner",
  "description": "Get 20% off any dinner entree",
  "discountPercent": 20,
  "maxRedemptions": 100,
  "currentRedemptions": 5,
  "startDate": "2025-08-18T09:00:00.000Z",
  "endDate": "2025-09-18T09:00:00.000Z",
  "createdAt": "2025-08-18T09:00:00.000Z",
  "status": "active"
}
```

### Collection: `coupons`
**Document ID: `AFF-MAR-FOO-ABC123`**
```json
{
  "id": "AFF-MAR-FOO-ABC123",
  "type": "AFFILIATE",
  "businessId": "biz_1",
  "influencerId": "inf_1",
  "offerId": "off_1", 
  "createdAt": "2025-08-17T09:00:00.000Z",
  "deadline": "2025-09-16T09:00:00.000Z",
  "status": "ACTIVE",
  "posAdded": true,
  "usageCount": 3,
  "lastUsedAt": "2025-08-18T08:30:00.000Z"
}
```

## 3. Test Your App
After adding this data:
1. Start your dev server: `npm run dev` 
2. Visit: http://localhost:3000/admin
3. Login with: devon@getkudjo.com / 1234567890!Dd
4. You should see your test data in the dashboards!

## Time: 5 minutes
That's it! You now have seed data to test with. 