# INSTRUCTIONS.md

> **Kudjo Affiliate — Full Build Guide (Windsurfer-optimized)**  
> Single-file documentation for developers. Copy this file into the repo root as `INSTRUCTIONS.md`.  
> Covers: architecture, data model, security rules, API surface, messaging, portals (Admin/Business/Influencer), POS options, payouts, exports, and step-by-step setup.

---

## 0) Quick Start (TL;DR)

1) **Prereqs**
- Node 20+, npm 10+
- Firebase CLI (`npm i -g firebase-tools`)
- A Firebase project (Firestore + Auth + Functions)
- (Optional) Vercel account for Next.js hosting

2) **Clone & Install**
```bash
git clone <your-repo>
cd <your-repo>
npm install
```

3) **Env**
Create `.env.local` (Next.js) and `.env` for Functions. Use the template below (see **Section 2.3**).

4) **Emulators (dev)**
```bash
firebase login
firebase use <your-firebase-project-id>
firebase emulators:start
# in another terminal, run web app
npm run dev
```

5) **Deploy (prod)**
```bash
npm run build
firebase deploy --only functions,firestore,hosting
# or deploy web via Vercel and Functions via Firebase
```

---

## 1) Product Overview

**Kudjo Affiliate** connects:
- **Businesses** → define discounts & influencer “meal” budgets; tiered rules; limits; campaign windows.
- **Influencers** → browse/accept offers, get affiliate code + one-time meal coupon, complete UGC requirements.
- **Admin** → approve accounts, edit any coupon, mass-message, view/ export metrics, manually input redemptions (until POS is integrated).

**Pay model** (current): merchants pay **$0.20 + 1%** per redeemed coupon.

**MVP constraints**
- Firestore is source of truth.
- POS data optional; **manual redemption entry** supported.
- Social metrics are **manual entry** (optional API pulls later).
- Messaging is Firebase-first (Firestore + optional FCM topics).

---

## 2) Architecture / Setup

### 2.1 Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, shadcn/ui, Recharts.
- **Backend**: Firebase Auth, Firestore, Cloud Functions (Express router).
- **Build/QA**: ESLint, Prettier, (optional) Jest.

### 2.2 Suggested Monorepo Layout
```
/apps
  /web                 # Next.js app (admin, business, influencer portals)
/functions            # Firebase Cloud Functions (API backend)
/packages
  /shared              # Shared TS types & Zod schemas
/docs                  # (optional) extra docs
INSTRUCTIONS.md        # this file
```

### 2.3 Environment Variables

**Next.js (`.env.local`)**
```
# Firebase (public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kudjo-affiliate.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kudjo-affiliate
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kudjo-affiliate.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=943798260444
NEXT_PUBLIC_FIREBASE_APP_ID=1:943798260444:web:c8c2ce35ee63c639865a19
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-2JNJ612PZT

# Control Center admin (set your own)
ADMIN_EMAIL=devon@getkudjo.com
ADMIN_PASSCODE=1234567890!Dd
# Demo flags
NEXT_PUBLIC_DEMO=1
DEMO_SEED_ON_BOOT=1

# Firebase Admin (from scripts/firebase-service-account.json)
FIREBASE_PROJECT_ID=kudjo-affiliate
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@kudjo-affiliate.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7M6yPTL4dl5K8
F9RCTfXTKfn2sgFlVGCTpsqZR7Mv84XZJq2/gSFo4NjrfF8gS7D3akHIG08guAW7
Paml8iEzLEYoS2DhMI9JP49hh7+8BHGB2RoDdbqfT7Fw6LdVAWttYwsV6rWm/iJ7
LQur82As+M5dCa6k87hxUxL+kZ/PMfMeZ79DNEOeIzdXR7/sX38XEiFghF0aoqg8
bLZOzi384KI8mPerQpYHC0HCAezy6CbpnG0/jQ10bfeJEOcWLW3fDItGtzQjr4x8
Ok1A1kltpCD6gU1/gSEaoNzKqh79AL3jZ/BroXzLjWA3UTSHnCgrfMPAY/+pXuQy
wJqkV/6hAgMBAAECggEACAiWxkhr7m6A/YpPXEH1HHrCdLPEOAM4vjnRRi1YMXMM
lhbWZRbTxm/8NHQzrxY7IfE4Ez5Rqoses9iRllERTXKqusG6P33u4RzyDc8zxBpC
C9slPxYY9tKUserY80JDctVmJ/G8YQccQez3ne0CDHo9YORNCJVevAx7uYZUiq+n
RlfEBsjysFx/zealRcwEGBVQ/rmPaEm0qJfIiQ3+9ZZjs3rUCpk3QUMz44bPELG4
MHCqBYlpVmIMfgGKCVU9IYMxUSMWVd/HlB6NaFLMjLtk5oceEuEI1KWezUjp1pUP
HPBSjKfyoX6zt7LxrChtnDf5UIgCEc4tDdjQsVG9gQKBgQDel6JO/2/kK5eUn5BX
ReCyNBWQPd4U1EREsQXBDpOhE/gdF64iGxWQ6B7u5qJpHHb+p80DpNviXJ5NirG6
eav0PSbiZcyKekrsezyWQ8ueOdki1y+sEuJbLStRJkWWJDln/2OLbkHXWJsqiAMM
8+GgPTphAMQrFxhxQg/sQdPvMwKBgQDXTEeRu03d8+n2PcOUgP9bPTwlKCldd4qu
lPMnVsZH+MPpi6U2zwzPk0qFDlf/RWEjNLS7FTOJSo6sk+lIv9k9oThqgdnM7pTB
eC4fOOV9723MH0/qyjvOT4BlrG3B2n9K3etb4RIJkML4GIeOk55LT32YBbvphh3G
J3+e5gQq2wKBgAGmkjePwV6pzBf4DvP2urHXnQlSzCDPaiowPeCuoP2izkY49Lug
A8rtTb1rzGyHH4LH78dFI7RMB4h/rM27NUE8attm8dtdCM00JMDgg9QKjceqXNoj
0bXnYdjaNc3lOt/AjxZrnOVh7NSl6Y/hBx1PFu29ObcwFqhQWxnfaxjtAoGBAKur
BuYMk2oGsubFGM2wjewSR4LZIyKDzvClk7wqVK/Oi2gNEQ9CyNQ6fZDafw/sIigQ
PottvEocSOcSiVCYqH+brYA/SYs+MR6S1TPQCi0AXGwGC5MK7eTzP03SzzFjJ1xq
1t/L9rXp14w7AtuMmQszttEgwVTSu6rkk73/ahNBAoGBAMOYJHzFi5CkwWybzylQ
y4WNpjoYSxBOzQmOmGb6EA+TVHZDr7bsABsoWSbIZnugQlrDGGcQmKJQu+p+Wxsq
UQInDntf+YOsfaTJHm1L2pqvIOxlbhE0DWKXHWR8Als6WrT9zSGBFINX7LqlG9r2
Bn3tFQfbtTqDQaqydhiIoD/Q
-----END PRIVATE KEY-----"

# Optional measurement ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-2JNJ612PZT
```

**Functions (`functions/.env` or via Firebase config)**
```
FIREBASE_PROJECT_ID=...
JWT_SECRET=...
ADMIN_EMAIL=...
ADMIN_PASSCODE=...
SQUARE_APPLICATION_ID=...          # optional (POS)
SQUARE_APPLICATION_SECRET=...      # optional
SQUARE_WEBHOOK_SIGNATURE_KEY=...   # optional
```

> Use `firebase functions:config:set key=value` as preferred. Do **not** commit secrets.

---

## 3) Authentication & Role Gating

- **Auth Methods**: Email/Password + Google (Firebase)
- **Roles**: `admin | business | influencer`
  - Admin auth is session-cookie/JWT via `/api/control-center/login` using `ADMIN_EMAIL` + `ADMIN_PASSCODE`.
  - Business/Influencer determined by presence of profile doc in Firestore.

**Client Role Resolve (simplified)**
```ts
// pseudo-client: determine role on auth state change
const user = firebaseAuth.currentUser
if (!user) role = null
else {
  if (adminSessionCookiePresent()) role = 'admin'
  else if (await existsDoc(`influencers/${user.uid}`)) role = 'influencer'
  else if (await existsDoc(`businesses/${user.uid}`)) role = 'business'
  else role = null
}
```

**Route Guards**
- `/control-center/*` → admin only
- `/business/*` → business only
- `/influencer/*` → influencer only
- `/auth/*` → unauth or switching

**Session Security**
- Admin JWT in HTTP-only, Secure cookie.
- Firebase Auth ID token for Business/Influencer API calls (bearer).

---

## 4) Firestore Data Model (Schemas)

> Keep fields minimal for MVP. Extend as needed.

### 4.1 Users
`users/{userId}`
```jsonc
{
  "id": "string",
  "email": "string",
  "role": "influencer" | "business",
  "createdAt": "Timestamp"
}
```

### 4.2 Businesses
`businesses/{businessId}`
```jsonc
{
  "id": "string",
  "ownerId": "string",
  "name": "string",
  "address": "string",
  "posProvider": "square" | "manual" | "clover",
  "couponSettings": {
    "defaultDiscountPct": 20,
    "tierSplits": { "small": 10, "medium": 15, "large": 20, "xl": 25 },
    "maxActiveInfluencers": 5,
    "couponLimit": 30
  },
  "status": "active" | "paused" | "closed",
  "createdAt": "Timestamp"
}
```

### 4.3 Influencers
`influencers/{influencerId}`
```jsonc
{
  "id": "string",
  "userId": "string",
  "name": "string",
  "verifiedByAdmin": true,
  "socialProfiles": {
    "instagram": "handle",
    "tiktok": "handle",
    "youtube": "url"
  },
  "tier": "small" | "medium" | "large" | "xl",
  "followerCount": 0,
  "createdAt": "Timestamp"
}
```

### 4.4 Offers (Campaigns)
`offers/{offerId}`
```jsonc
{
  "id": "string",
  "businessId": "string",
  "title": "string",
  "description": "string",
  "discountPct": 20,
  "freeMealBudget": 25,
  "tierOverrides": { "xl": { "discountPct": 25, "freeMealBudget": 35 } },
  "itemSpecific": [ "item1", "item2" ],
  "startDate": "Timestamp",
  "endDate": "Timestamp",
  "status": "active" | "ended",
  "maxRedemptions": 500,
  "maxActiveInfluencers": 5
}
```

### 4.5 Coupons
`coupons/{couponId}`
```jsonc
{
  "id": "string",
  "offerId": "string",
  "businessId": "string",
  "influencerId": "string",
  "code": "KU-ABCD12",
  "qrUrl": "https://...",
  "type": "affiliate" | "meal",
  "status": "unused" | "redeemed" | "expired",
  "redeemedAt": "Timestamp",
  "redeemedAmount": 0
}
```

### 4.6 Affiliate Links (optional aliasing)
`affiliateLinks/{linkId}`
```jsonc
{
  "id": "string",
  "offerId": "string",
  "businessId": "string",
  "influencerId": "string",
  "code": "KU-ABCD12",
  "clicks": 0,
  "createdAt": "Timestamp"
}
```

### 4.7 Redemptions (manual or POS-sync)
`redemptions/{redeemId}`
```jsonc
{
  "id": "string",
  "couponId": "string",
  "businessId": "string",
  "influencerId": "string",
  "amount": 0,
  "source": "manual" | "square" | "clover" | "toast",
  "createdAt": "Timestamp"
}
```

### 4.8 Conversations & Messages
`conversations/{conversationId}`
```jsonc
{
  "id": "string",
  "businessId": "string",
  "influencerId": "string",
  "lastMessage": "string",
  "lastMessageAt": "Timestamp",
  "unreadCount": { "business": 0, "influencer": 1 }
}
```

`conversations/{conversationId}/messages/{messageId}`
```jsonc
{
  "id": "string",
  "senderId": "string",
  "senderType": "business" | "influencer",
  "content": "string",
  "timestamp": "Timestamp",
  "read": false
}
```

### 4.9 Announcements (Admin Broadcast)
`announcements/{announcementId}`
```jsonc
{
  "title": "string",
  "content": "string",
  "targetRoles": [ "business", "influencer" ],
  "timestamp": "Timestamp"
}
```

---

## 5) Firestore Security Rules (MVP)

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
        (isSignedIn() && (request.resource.data.businessId == uid() || request.resource.data.influencerId == uid()));
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

---

## 6) API Surface (Cloud Functions + Next API)

### 6.1 Auth
- `POST /api/control-center/login` (Next): `{ email, passcode }` → sets `admin_session` cookie (JWT).
- `POST /api/auth/login` (Next/Client uses Firebase Auth directly).

### 6.2 Business
- `POST /functions/business.create`  
  **Body**: `{ name, address, posProvider }`  
  **Auth**: Firebase token of business user  
  **Result**: `business doc`
- `POST /functions/offer.create`  
  **Body**: `Offer` fields (see 4.4)  
  **Auth**: Business  
  **Result**: `offer doc`
- `POST /functions/business.pos.connect` *(optional Square OAuth)*  
  **Body**: `{ oauthCode }`  
  **Auth**: Business  
  **Result**: stored merchant token (Functions config/Secret Manager)

### 6.3 Influencer
- `POST /functions/link.create`  
  **Body**: `{ offerId }`  
  **Auth**: Influencer (must be admin-verified)  
  **Result**: affiliate coupon (type=`affiliate`)
- `POST /functions/coupon.claim`  
  **Body**: `{ offerId }`  
  **Auth**: Influencer  
  **Result**: meal coupon (type=`meal`)

### 6.4 Redemptions (Admin/manual)
- `POST /functions/redemption.create`  
  **Body**: `{ couponId, amount }`  
  **Auth**: Admin  
  **Result**: `redemptions` doc + update `coupons` status/amount

### 6.5 Messaging
- `POST /functions/conversation.ensure`  
  **Body**: `{ businessId, influencerId }`  
  **Auth**: Business or Influencer (participant)  
  **Result**: upsert conversation
- `POST /functions/message.send`  
  **Body**: `{ conversationId, content }`  
  **Auth**: participant  
  **Result**: message doc + updates conversation last/ unread
- `GET /functions/message.fetch?conversationId=...`  
  **Auth**: participant  
  **Result**: ordered messages

### 6.6 Admin Broadcast
- `POST /functions/admin.broadcast`  
  **Body**: `{ title, content, targetRoles }`  
  **Auth**: Admin  
  **Result**: announcement doc (+ optional FCM topic push)

---

## 7) Client Integration (React/Next.js)

### 7.1 Firebase Client Init
```ts
// apps/web/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

### 7.2 Messaging Hook
```ts
// apps/web/hooks/useConversation.ts
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<any[]>([])
  useEffect(() => {
    if (!conversationId) return
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    )
    const unsub = onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => unsub()
  }, [conversationId])
  return messages
}
```

### 7.3 Send Message
```ts
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function sendMessage(conversationId: string, senderType: 'business' | 'influencer', content: string) {
  const ref = collection(db, 'conversations', conversationId, 'messages')
  await addDoc(ref, { senderType, content, timestamp: serverTimestamp(), read: false })
  await updateDoc(doc(db, 'conversations', conversationId), { lastMessage: content, lastMessageAt: serverTimestamp() })
}
```

### 7.4 Export PDF (Charts)
```ts
// apps/web/lib/export-pdf.ts
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportElementToPDF(elementId: string, filename: string) {
  const el = document.getElementById(elementId)
  if (!el) return
  const canvas = await html2canvas(el)
  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF('landscape', 'pt', 'a4')
  const w = pdf.internal.pageSize.getWidth()
  const h = (canvas.height * w) / canvas.width
  pdf.addImage(img, 'PNG', 0, 0, w, h)
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
```

---

## 8) Business & Influencer Flows

### 8.1 Influencer Flow
1. Sign up (Google or Email/Password)
2. **Admin verifies** influencer profile (sets `verifiedByAdmin = true`)
3. View **Available Offers** (filter by tier/time/status)
4. Click **Start Campaign** → server creates:
   - Affiliate coupon (`type="affiliate"`, unique `code`)
   - Meal coupon (`type="meal"`, value = `freeMealBudget`)
5. Display **two codes** (with QR) + legal terms:
   - Must post within 7 days of meal usage; keep post 7–14 days minimum; non-slander clause.
6. Track redemptions (admin/manual or POS)
7. Payouts computed by reconciliation (see §9)

### 8.2 Business Flow
1. Sign up; create **Business** profile
2. Define **defaults**: `defaultDiscountPct`, tier splits, `maxActiveInfluencers`, `couponLimit`
3. Create **Offer** (date window, item-specific optional, caps)
4. (Optional) Connect POS (Square OAuth) — or remain **Manual**
5. Review active influencers; end offers anytime (MVP leaves disputes off-platform)
6. Download metrics PDF/CSV

### 8.3 Admin Flow
- Approve influencers; edit any coupon or offer
- **Manual redemptions** entry (`couponId`, `amount`)
- Mass message (Announcements)
- Export dashboards
- Ensure **no dead buttons**: remove/implement all visible actions

---

## 9) Payouts & Fees (MVP math)

For each **redeemed** coupon:
- **Gross** = `redeemedAmount`
- **Kudjo Fee** = `$0.20 + 1% * redeemedAmount`
- **Influencer Payout** = `(business tier split %) * redeemedAmount` (or per-offer override)
- **Business Net** = `gross - influencerPayout - kudjoFee`

> Implement in a Cloud Function `reconcile.daily`:
> - Scan `redemptions` created since last run
> - For each, upsert a `ledger` entry (optional collection): `{ businessId, influencerId, couponId, gross, fee, payout, createdAt }`
> - Aggregate to show **pending payouts** per influencer and **fees owed** per business

---

## 10) POS Integrations (MVP-first)

- **Default**: **Manual** — Admin records redemptions (fastest path to value).
- **Square (optional)**:
  - Implement OAuth in a Functions HTTPS endpoint:
    - Exchange `code` → merchant access token
    - Store in **GCP Secret Manager** or Functions config (never in Firestore)
    - Subscribe to **Payments webhooks**; on payment with coupon note or code, create `redemptions` doc
- **Clover/Toast**:
  - Defer. If merchant can export CSV (daily), add **CSV import** tool as interim.

---

## 11) UI / UX Notes (MVP)

- **Admin Dashboard** (no clutter):
  - KPIs: `#Businesses`, `#Influencers`, `#Offers`, `#Coupons`, `#Redemptions`, `Revenue`
  - Charts: Daily redemptions line, Tier mix bar, Top influencers table
  - Actions: Export CSV/PDF
- **Business Dashboard**:
  - Active offers, remaining caps, active influencers, redemptions summary
  - Buttons: `Create Offer`, `End Offer`, `Export`
- **Influencer Dashboard**:
  - `Active Campaigns` (affiliate + meal codes)
  - `Past Campaigns`
  - `Browse Offers` (filter by tier/nearby/date)
- **Every button does something**. If not implemented, **hide it**.

---

## 12) Validation (Zod) — shared types

```ts
// packages/shared/schemas.ts
import { z } from 'zod'

export const Tier = z.enum(['small','medium','large','xl'])

export const OfferSchema = z.object({
  businessId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  discountPct: z.number().min(0).max(100),
  freeMealBudget: z.number().min(0).default(0),
  tierOverrides: z.record(Tier, z.object({
    discountPct: z.number().min(0).max(100).optional(),
    freeMealBudget: z.number().min(0).optional()
  })).optional(),
  itemSpecific: z.array(z.string()).optional(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['active','ended']).default('active'),
  maxRedemptions: z.number().int().min(0).optional(),
  maxActiveInfluencers: z.number().int().min(0).optional()
})

export const CouponSchema = z.object({
  offerId: z.string(),
  businessId: z.string(),
  influencerId: z.string(),
  code: z.string().min(4),
  type: z.enum(['affiliate','meal']),
})

export const RedemptionSchema = z.object({
  couponId: z.string(),
  amount: z.number().min(0),
  source: z.enum(['manual','square','clover','toast']).default('manual')
})
```

---

## 13) Firestore Indexes (examples)

Create composite indexes for:
- `offers` by `businessId` + `status` + `startDate`
- `coupons` by `influencerId` + `status`
- `redemptions` by `businessId` + `createdAt`

Example (Firestore `indexes.json` entry):
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
    }
  ]
}
```

---

## 14) Admin Login (Next API)

```ts
// apps/web/app/api/control-center/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  const { email, passcode } = await req.json()
  if (email !== process.env.ADMIN_EMAIL || passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET!, { expiresIn: '12h' })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
  return res
}
```

**Middleware guard** (`apps/web/middleware.ts`) should block `/control-center/*` without `admin_session`.

---

## 15) Cloud Functions (Express Router)

```ts
// functions/src/index.ts
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import express from 'express'
import { z } from 'zod'
admin.initializeApp()

const app = express()
app.use(express.json())

function requireAuth(req: any, res: any, next: any) {
  const idToken = (req.headers.authorization || '').replace('Bearer ', '')
  admin.auth().verifyIdToken(idToken).then(claims => { req.user = claims; next() }).catch(() => res.status(401).json({error:'unauth'}))
}

app.post('/business.create', requireAuth, async (req, res) => {
  const schema = z.object({ name: z.string(), address: z.string(), posProvider: z.enum(['square','manual','clover']) })
  const data = schema.parse(req.body)
  await admin.firestore().collection('businesses').doc(req.user.uid).set({
    id: req.user.uid, ownerId: req.user.uid, ...data, createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
  res.json({ ok: true })
})

app.post('/offer.create', requireAuth, async (req, res) => {
  const data = (await import('../../packages/shared/schemas')).OfferSchema.parse(req.body)
  const ref = await admin.firestore().collection('offers').add({ ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() })
  res.json({ id: ref.id })
})

app.post('/coupon.claim', requireAuth, async (req, res) => {
  const schema = z.object({ offerId: z.string(), type: z.enum(['affiliate','meal']).default('meal') })
  const { offerId, type } = schema.parse(req.body)
  const offer = await admin.firestore().collection('offers').doc(offerId).get()
  if (!offer.exists) return res.status(404).json({ error: 'offer_not_found' })
  const code = `KU-${Math.random().toString(36).slice(2,8).toUpperCase()}`
  const docRef = await admin.firestore().collection('coupons').add({
    offerId, businessId: offer.get('businessId'), influencerId: req.user.uid, code, type, status: 'unused',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  res.json({ id: docRef.id, code })
})

app.post('/redemption.create', async (req, res) => {
  const schema = z.object({ couponId: z.string(), amount: z.number() })
  const { couponId, amount } = schema.parse(req.body)
  const db = admin.firestore()
  const couponRef = db.collection('coupons').doc(couponId)
  const coupon = await couponRef.get()
  if (!coupon.exists) return res.status(404).json({ error: 'coupon_not_found' })

  const data = coupon.data()!
  await db.collection('redemptions').add({
    couponId, businessId: data.businessId, influencerId: data.influencerId,
    amount, source: 'manual', createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  await couponRef.set({ status: 'redeemed', redeemedAt: admin.firestore.FieldValue.serverTimestamp(), redeemedAmount: amount }, { merge: true })
  res.json({ ok: true })
})

exports.api = functions.https.onRequest(app)
```

---

## 16) Testing & Quality (MVP)

- **Smoke**: sign-in, create business, create offer, claim coupons, send messages, manual redemption.
- **Rules**: run emulator security tests for read/write paths.
- **Type-safety**: Zod on incoming payloads; shared types for UI.

---

## 17) Deployment Notes

- **Next.js**: Vercel or Firebase Hosting (SSR support config).
- **Functions**: `firebase deploy --only functions`
- **Env**: add all secrets to hosting platform; never commit.
- **Domains**: set Auth authorized domains (Firebase console).

---

## 18) Checklist (EOD MVP)

- [ ] Admin login works; `/control-center` gated.
- [ ] Business onboarding + offer creation works.
- [ ] Influencer approval toggled by admin.
- [ ] Influencer can **Start Campaign** → sees **affiliate** + **meal** codes.
- [ ] Admin can **enter manual redemption**; payout math visible.
- [ ] Dashboards show **only** relevant KPIs; **Export PDF/CSV** works.
- [ ] Messaging: 1:1 chat functional; announcements render.
- [ ] No dead buttons/links; hidden if not implemented.

---

## 19) Appendix: Legal Strings (UI copy, MVP)

- **UGC Requirement**: “By accepting a meal coupon, you agree to publish at least one post within **7 days** of redemption. The post must remain live for **7–14 days** (per offer). No defamatory content. Businesses may request reasonable edits.”
- **Early End**: “Businesses may end an offer at any time; disputes are handled off-platform.”
- **Privacy**: “Transaction and messaging data are stored in Firebase.”

---

_End of single-file instructions._
