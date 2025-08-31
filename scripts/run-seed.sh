#!/bin/bash

# Kudjo Affiliate Database Seeding Script
# This script populates the database with 200 businesses and 200 influencers

echo "🚀 Kudjo Affiliate Database Seeding"
echo "=================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "scripts/seed-production.ts" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 This will create:"
echo "   - 1 admin user (devon@getkudjo.com)"
echo "   - 200 businesses with realistic data"
echo "   - 200 influencers with follower metrics"
echo "   - 500-800 offers across businesses"
echo "   - 500-800 coupons with activity data"
echo "   - Affiliate links and redemption records"
echo ""

read -p "⚠️  This will populate your Firebase database. Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Seeding cancelled"
    exit 1
fi

echo ""
echo "🔧 Compiling TypeScript..."

# Compile the TypeScript file
npx tsc scripts/seed-production.ts --outDir scripts/dist --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --resolveJsonModule --skipLibCheck

if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo "✅ TypeScript compiled successfully"
echo ""

# Check if Firebase project is configured
echo "🔍 Checking Firebase configuration..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not authenticated with Firebase CLI"
    echo "Please run: firebase login"
    exit 1
fi

# Get current project from .firebaserc
if [ ! -f ".firebaserc" ]; then
    echo "❌ No Firebase project configured"
    echo "Please run: firebase use kudjo-affiliate"
    exit 1
fi

PROJECT_ID=$(grep -o 'kudjo-affiliate' .firebaserc | head -1)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No Firebase project selected"
    echo "Please run: firebase use kudjo-affiliate"
    exit 1
fi

echo "✅ Using Firebase project: $PROJECT_ID"
echo ""

# Set environment variables for Firebase Admin (prefer production unless SEED_EMULATOR=1)
export GCLOUD_PROJECT="$PROJECT_ID"

# If GOOGLE_APPLICATION_CREDENTIALS not set, try common service account file
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  if [ -f "scripts/firebase-service-account.json" ]; then
    export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/firebase-service-account.json"
  elif [ -f "service-account.json" ]; then
    export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account.json"
  fi
fi

# Only use emulator if explicitly requested
if [ "$SEED_EMULATOR" = "1" ]; then
  export FIRESTORE_EMULATOR_HOST="${FIRESTORE_EMULATOR_HOST:-localhost:8080}"
else
  unset FIRESTORE_EMULATOR_HOST
fi

echo "🌱 Starting database seeding..."
echo "This may take several minutes..."
echo ""

# Run the seed script
node scripts/dist/seed-production.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Database seeding completed successfully!"
    echo ""
    echo "📊 You can now:"
    echo "   - View your data in the Firebase Console"
    echo "   - Start the development server: npm run dev"
    echo "   - Access admin dashboard at: http://localhost:3000/admin"
    echo "   - Login with: devon@getkudjo.com / 1234567890!Dd"
    echo ""
    echo "📁 Data created:"
    echo "   - businesses: 200 records"
    echo "   - influencers: 200 records"
    echo "   - users: 401 records (200 business owners + 200 influencers + 1 admin)"
    echo "   - offers: varies by business"
    echo "   - coupons: 500-800 records"
    echo "   - couponStatsDaily: activity records"
    echo "   - redemptions: transaction records"
    echo "   - affiliateLinks: for affiliate coupons"
else
    echo ""
    echo "❌ Database seeding failed!"
    echo "Check the error messages above for details."
    exit 1
fi

# Clean up compiled files
rm -rf scripts/dist

echo "✨ All done!" 