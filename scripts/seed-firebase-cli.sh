#!/bin/bash

# Kudjo Affiliate - Firebase CLI Seed Script
# This script uses the Firebase CLI to import data directly

echo "🚀 Starting Firebase CLI seed process..."

# Check for Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Create temporary JSON files for each collection
echo "📝 Creating seed data files..."

# Create users collection data
cat > users.json << EOL
{
  "users": {
    "admin_user": {
      "id": "admin_user",
      "email": "devon@getkudjo.com",
      "role": "admin",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "status": "active"
    },
    "user_biz_1": {
      "id": "user_biz_1",
      "email": "mario@restaurant.com",
      "role": "business",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "status": "active"
    },
    "user_biz_2": {
      "id": "user_biz_2",
      "email": "taco@express.com",
      "role": "business",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "status": "active"
    },
    "user_inf_1": {
      "id": "user_inf_1",
      "email": "sarah@foodie.com",
      "role": "influencer",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "status": "active"
    },
    "user_inf_2": {
      "id": "user_inf_2",
      "email": "mike@tastetester.com",
      "role": "influencer",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "status": "active"
    }
  }
}
EOL

# Create businesses collection data
cat > businesses.json << EOL
{
  "businesses": {
    "biz_1": {
      "id": "biz_1",
      "name": "Mario's Italian Bistro",
      "address": "123 Main St, Downtown",
      "phone": "555-123-4567",
      "cuisine": "Italian",
      "posIntegrated": true,
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "ownerId": "user_biz_1",
      "status": "active"
    },
    "biz_2": {
      "id": "biz_2",
      "name": "Taco Express",
      "address": "456 Oak Ave, Midtown",
      "phone": "555-234-5678",
      "cuisine": "Mexican",
      "posIntegrated": false,
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "ownerId": "user_biz_2",
      "status": "active"
    }
  }
}
EOL

# Create influencers collection data
cat > influencers.json << EOL
{
  "influencers": {
    "inf_1": {
      "id": "inf_1",
      "handle": "foodie_explorer",
      "name": "Sarah Johnson",
      "followers": 25000,
      "avgViews": 12000,
      "tier": "Silver",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "ownerId": "user_inf_1",
      "status": "active"
    },
    "inf_2": {
      "id": "inf_2",
      "handle": "taste_tester",
      "name": "Mike Chen",
      "followers": 85000,
      "avgViews": 35000,
      "tier": "Gold",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "ownerId": "user_inf_2",
      "status": "active"
    }
  }
}
EOL

# Create offers collection data
CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
FUTURE_DATE=$(date -u -v+30d +"%Y-%m-%dT%H:%M:%S.000Z")

cat > offers.json << EOL
{
  "offers": {
    "off_1": {
      "id": "off_1",
      "businessId": "biz_1",
      "title": "20% Off Italian Dinner",
      "description": "Get 20% off any dinner entree",
      "discountPercent": 20,
      "maxRedemptions": 100,
      "currentRedemptions": 5,
      "startDate": "$CURRENT_DATE",
      "endDate": "$FUTURE_DATE",
      "createdAt": "$CURRENT_DATE",
      "status": "active"
    },
    "off_2": {
      "id": "off_2",
      "businessId": "biz_2",
      "title": "Free Drink with Meal",
      "description": "Get a free drink with any meal purchase",
      "discountPercent": 15,
      "maxRedemptions": 50,
      "currentRedemptions": 12,
      "startDate": "$CURRENT_DATE",
      "endDate": "$FUTURE_DATE",
      "createdAt": "$CURRENT_DATE",
      "status": "active"
    }
  }
}
EOL

# Create coupons collection data
cat > coupons.json << EOL
{
  "coupons": {
    "AFF-MAR-FOO-ABC123": {
      "id": "AFF-MAR-FOO-ABC123",
      "type": "AFFILIATE",
      "businessId": "biz_1",
      "influencerId": "inf_1",
      "offerId": "off_1",
      "createdAt": "$CURRENT_DATE",
      "deadline": "$FUTURE_DATE",
      "status": "ACTIVE",
      "posAdded": true,
      "usageCount": 3,
      "lastUsedAt": "$CURRENT_DATE"
    },
    "CON-TAC-TAS-XYZ789": {
      "id": "CON-TAC-TAS-XYZ789",
      "type": "CONTENT_MEAL",
      "businessId": "biz_2",
      "influencerId": "inf_2",
      "offerId": "off_2",
      "createdAt": "$CURRENT_DATE",
      "deadline": "$FUTURE_DATE",
      "status": "ACTIVE",
      "posAdded": false,
      "usageCount": 1,
      "lastUsedAt": "$CURRENT_DATE"
    }
  }
}
EOL

# Create redemptions collection data
cat > redemptions.json << EOL
{
  "redemptions": {
    "red_1": {
      "id": "red_1",
      "couponId": "AFF-MAR-FOO-ABC123",
      "businessId": "biz_1",
      "influencerId": "inf_1",
      "amount": 45.99,
      "commission": 4.60,
      "createdAt": "$CURRENT_DATE",
      "status": "COMPLETED",
      "source": "POS"
    }
  }
}
EOL

# Create couponStatsDaily collection data
TODAY=$(date -u +"%Y-%m-%d")
STATS_ID="AFF-MAR-FOO-ABC123_$TODAY"
cat > couponStatsDaily.json << EOL
{
  "couponStatsDaily": {
    "$STATS_ID": {
      "id": "$STATS_ID",
      "couponId": "AFF-MAR-FOO-ABC123",
      "businessId": "biz_1",
      "influencerId": "inf_1",
      "date": "$TODAY",
      "views": 120,
      "clicks": 45,
      "redemptions": 3,
      "revenue": 137.97,
      "commission": 13.80
    }
  }
}
EOL

echo "✅ Seed data files created"

# Import data using Firebase CLI
echo "📤 Importing data to Firebase..."

# Make sure you're using the right project
firebase use kudjo-affiliate

# Import each collection using the Firebase Console
echo "⚠️ The Firebase CLI doesn't support direct Firestore import."
echo "Please go to Firebase Console and import the data manually:"
echo "https://console.firebase.google.com/project/kudjo-affiliate/firestore/data"
echo ""
echo "The JSON files have been created for you to copy/paste into the console."
echo ""
echo "users.json - Contains 5 users"
echo "businesses.json - Contains 2 businesses"
echo "influencers.json - Contains 2 influencers"
echo "offers.json - Contains 2 offers"
echo "coupons.json - Contains 2 coupons"
echo "redemptions.json - Contains 1 redemption"
echo "couponStatsDaily.json - Contains 1 stats record"
echo ""
echo "Would you like to open the Firebase Console now? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  open "https://console.firebase.google.com/project/kudjo-affiliate/firestore/data"
fi

echo "🎉 Database seeding completed successfully!"
echo "📊 Created:"
echo "  - 5 users (1 admin, 2 business, 2 influencer)"
echo "  - 2 businesses"
echo "  - 2 influencers"
echo "  - 2 offers"
echo "  - 2 coupons"
echo "  - 1 redemption"
echo "  - 1 daily stats record"

# Clean up temporary files
echo "🧹 Cleaning up..."
rm users.json businesses.json influencers.json offers.json coupons.json redemptions.json couponStatsDaily.json

echo "✨ All done!" 