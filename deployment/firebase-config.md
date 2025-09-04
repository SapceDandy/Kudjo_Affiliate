# Firebase Configuration for Production

## Firebase Functions Configuration

Set environment variables using Firebase CLI:

```bash
# Core Configuration
firebase functions:config:set app.jwt_secret="your_jwt_secret_here"
firebase functions:config:set app.admin_email="devon@getkudjo.com"
firebase functions:config:set app.admin_passcode="your_secure_passcode"

# Firebase Project
firebase functions:config:set firebase.project_id="kudjo-affiliate"

# Optional POS Integrations
firebase functions:config:set square.app_id="your_square_app_id"
firebase functions:config:set square.app_secret="your_square_secret"
firebase functions:config:set square.webhook_key="your_square_webhook_key"
```

## Firestore Security Rules

Ensure these rules are deployed to production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    function isAdmin() { return request.auth.token.admin == true; }
    
    match /users/{userId} {
      allow read: if isSignedIn() && (userId == uid() || isAdmin());
      allow write: if isAdmin() || (isSignedIn() && userId == uid());
    }
    
    match /businesses/{businessId} {
      allow read: if true;
      allow write: if isAdmin() || (isSignedIn() && businessId == uid());
    }
    
    match /influencers/{influencerId} {
      allow read: if isSignedIn() && (influencerId == uid() || isAdmin());
      allow write: if isAdmin() || (isSignedIn() && influencerId == uid());
    }
    
    match /offers/{offerId} {
      allow read: if true;
      allow write: if isAdmin() || (isSignedIn() && request.resource.data.businessId == uid());
    }
    
    match /coupons/{couponId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    match /redemptions/{redeemId} {
      allow read: if isAdmin() || isSignedIn();
      allow write: if isAdmin();
    }
    
    match /conversations/{convId} {
      allow read, write: if isAdmin() ||
        (isSignedIn() && (resource.data.businessId == uid() || resource.data.influencerId == uid()));
      match /messages/{messageId} {
        allow read, write: if isAdmin() || isSignedIn();
      }
    }
    
    match /announcements/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

## Firebase Auth Configuration

1. **Authorized Domains**: Add your production domains
   - `kudjo-affiliate.web.app`
   - `kudjo-affiliate.firebaseapp.com`
   - `app.getkudjo.com` (if using custom domain)
   - `localhost` (for development)

2. **Sign-in Methods**: Enable
   - Email/Password
   - Google OAuth

3. **Email Templates**: Customize
   - Password reset emails
   - Email verification
   - Email change confirmation

## Firestore Indexes

Deploy these composite indexes:

```json
{
  "indexes": [
    {
      "collectionGroup": "offers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "businessId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "coupons",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "influencerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "redemptions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "businessId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "conversations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "businessId", "order": "ASCENDING" },
        { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Deployment Commands

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy functions
firebase deploy --only functions

# Deploy hosting (if using Firebase Hosting)
firebase deploy --only hosting

# Deploy everything
firebase deploy
```
