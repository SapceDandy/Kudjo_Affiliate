# Database Seeding Guide

This guide explains how to populate your Kudjo Affiliate platform database with realistic test data.

## 🎯 What Gets Created

The production seed script creates a comprehensive dataset including:

### **Users & Accounts**
- **1 Admin User**: `devon@getkudjo.com` / `1234567890!Dd`
- **200 Business Owners**: Realistic business owners with contact information
- **200 Influencers**: Content creators with follower metrics and engagement data

### **Business Data**
- **200 Businesses**: Restaurants, cafes, bars, retail stores, health/wellness centers
- **Realistic Business Info**: 
  - Names like "The Golden Spoon", "Urban Kitchen", "Morning Brew"
  - Addresses across 15 major US cities (SF, LA, NYC, Chicago, Miami, etc.)
  - Business hours, cuisine types, average ticket values
  - POS integration status (Square, Toast, Clover, Manual)
  - Geographic coordinates for mapping features

### **Influencer Profiles**
- **Tiered Influencer System**:
  - **40% Micro Influencers**: 1K-10K followers (Bronze tier)
  - **30% Mid-tier**: 10K-100K followers (Silver/Gold tier)
  - **20% Macro**: 100K-500K followers (Gold tier)
  - **10% Mega**: 500K-2M followers (Platinum tier)
- **Engagement Metrics**: Realistic follower counts, average views, engagement rates
- **Geographic Distribution**: Spread across major cities

### **Offers & Promotions**
- **400-800 Offers**: 1-4 offers per business
- **Realistic Promotions**: 
  - "25% Off Italian Food"
  - "Buy One Get One Free Burgers"
  - "Happy Hour Special"
  - "$10 Off Your Order"
- **Business Rules**: Minimum spend requirements, blackout dates, time restrictions

### **Coupons & Activity**
- **500-800 Active Coupons**:
  - **AFFILIATE**: Link-based promotions with QR codes
  - **CONTENT_MEAL**: Influencer content requirements with deadlines
- **Realistic Activity Data**:
  - Daily usage statistics over the past 60 days
  - Revenue tracking from $25-150 per transaction
  - Conversion rates varying by influencer tier
  - Redemption records with POS integration data

### **Revenue & Analytics Data**
- **Historical Performance**: 60 days of activity data
- **Daily Stats**: Usage counts, revenue, payout calculations
- **Realistic Patterns**: 
  - Weekend vs weekday variations
  - Seasonal trends and fluctuations
  - Influencer tier-based performance differences

## 🚀 How to Run Seed Scripts

### **Prerequisites**

1. **Firebase CLI**: Install and authenticate
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Project Setup**: Configure your Firebase project
   ```bash
   firebase use your-project-id
   ```

3. **Dependencies**: Install project dependencies
   ```bash
   npm install
   ```

### **Option 1: Full Production Seed (Recommended)**

The comprehensive script with safety checks and progress monitoring:

```bash
npm run seed:production
```

**What this does:**
- ✅ Validates Firebase CLI authentication
- ✅ Confirms project configuration
- ✅ Compiles TypeScript safely
- ✅ Shows progress during creation
- ✅ Provides detailed completion summary
- ✅ Cleans up temporary files

### **Option 2: Simple Direct Execution**

For quick development seeding without safety checks:

```bash
npm run seed:simple
```

### **Option 3: Original Basic Seed**

The original minimal seed script (for comparison):

```bash
npm run seed
```

## 📊 Expected Results

After successful seeding, you'll have:

### **Firebase Collections**
- `users`: 401 records (1 admin + 200 business owners + 200 influencers)
- `businesses`: 200 records with complete business profiles
- `influencers`: 200 records with follower metrics and tiers
- `offers`: 400-800 promotional offers
- `coupons`: 500-800 active coupons with realistic distribution
- `couponStatsDaily`: Historical performance data
- `redemptions`: Individual transaction records
- `affiliateLinks`: QR-enabled promotional links

### **Dashboard Data**
- **Admin Dashboard**: Platform-wide KPIs, user lifecycle funnel, system health
- **Business Dashboard**: ROAS tracking, influencer leaderboards, payout forecasting
- **Influencer Dashboard**: Earnings tracking, top businesses, compliance monitoring

## 🔧 Customization Options

### **Modify Business Types**

Edit `scripts/seed-production.ts` to change business categories:

```typescript
const businessTypes = [
  { type: 'Restaurant', cuisines: ['Italian', 'Mexican', 'Asian'] },
  { type: 'Retail', cuisines: ['Fashion', 'Electronics'] },
  // Add your custom business types
];
```

### **Adjust Influencer Distribution**

Modify follower count distribution:

```typescript
function generateRealisticFollowers(): number {
  const rand = Math.random();
  if (rand < 0.5) return randomInt(1000, 5000);    // 50% micro
  if (rand < 0.8) return randomInt(5000, 50000);   // 30% mid-tier
  if (rand < 0.95) return randomInt(50000, 200000); // 15% macro
  return randomInt(200000, 1000000);                // 5% mega
}
```

### **Change Geographic Distribution**

Add or modify cities in the cities array:

```typescript
const cities = [
  { name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { name: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  // Add your target cities
];
```

## ⚠️ Important Notes

### **Data Volume**
- **Seeding Time**: 5-15 minutes depending on your internet connection
- **Database Size**: ~2-3MB of structured data
- **Firebase Costs**: Well within free tier limits for development

### **Safety Considerations**
- **Production Warning**: Only run on development/staging environments
- **Data Deletion**: Seed scripts append data; they don't clear existing records
- **Rate Limiting**: Includes built-in delays to avoid Firebase rate limits

### **Authentication Setup**
The seed script creates an admin user with these credentials:
- **Email**: `devon@getkudjo.com`
- **Password**: `1234567890!Dd`

Make sure your environment variables in `apps/web/.env.local` match:
```
ADMIN_EMAIL=devon@getkudjo.com
ADMIN_PASSCODE=1234567890!Dd
```

## 🎨 Data Realism Features

### **Business Authenticity**
- Realistic business names and addresses
- Proper operating hours (6 AM - 11 PM, some closed Sundays)
- Industry-appropriate average ticket values
- Geographic clustering in business districts

### **Influencer Realism**
- Handles like `@foodielover`, `@tastebud_adventures`
- Engagement rates correlating with follower counts
- Tier progression based on authentic thresholds
- Geographic distribution matching target demographics

### **Activity Patterns**
- Weekend vs weekday usage variations
- Seasonal trends and promotional cycles
- Realistic redemption rates (15-40% conversion)
- Business-appropriate order values

### **Revenue Modeling**
- Tiered influencer payouts (Bronze: 15-20%, Platinum: 25-35%)
- Platform fee calculations (15% standard)
- Hold periods for fraud prevention
- Realistic ROAS calculations (2.5x-4.5x average)

## 🔍 Verification Steps

After seeding, verify your data:

1. **Firebase Console**: Check collection counts match expected values
2. **Admin Dashboard**: Login at `http://localhost:3000/admin`
3. **Platform KPIs**: Verify realistic metrics in global dashboard
4. **Business Data**: Check influencer leaderboards and tier distribution
5. **Activity Data**: Confirm coupon usage and redemption patterns

## 🐛 Troubleshooting

### **Common Issues**

**"Firebase CLI not authenticated"**
```bash
firebase login
firebase projects:list
```

**"No Firebase project selected"**
```bash
firebase use your-project-id
```

**"TypeScript compilation failed"**
```bash
npm install -g typescript
npm install
```

**"Import path errors"**
The seed script uses local type definitions to avoid monorepo import issues.

### **Performance Issues**

If seeding is slow:
- Check your internet connection
- Verify Firebase project region (closer is faster)
- Run during off-peak hours to avoid API rate limiting

### **Data Validation**

Verify data integrity:
```bash
# Check collection counts in Firebase Console
# Businesses: should be 200
# Influencers: should be 200
# Users: should be 401
# Coupons: should be 500-800
```

## 📈 Next Steps

After successful seeding:

1. **Start Development Server**: `npm run dev:web`
2. **Access Dashboards**:
   - Admin: `http://localhost:3000/admin`
   - Business: `http://localhost:3000/business`
   - Influencer: `http://localhost:3000/influencer`
3. **Test Authentication**: Use seeded credentials
4. **Explore Analytics**: Review charts and KPIs
5. **API Testing**: Use seeded data for endpoint validation

Happy coding! 🎉 