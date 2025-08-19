#!/bin/bash

# Kudjo Affiliate Database Seeding Script (No Prompts)
# This script populates the Firebase database with realistic test data

set -e  # Exit on any error

echo "🚀 Kudjo Affiliate Database Seeding (Auto-run)"
echo "=============================================="
echo ""
echo "📋 Creating test data..."
echo ""

# Check for required tools
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found"
    echo "Please install Node.js"
    exit 1
fi

# Ensure we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Must run from project root directory"
    exit 1
fi

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

# Set environment variables for Firebase Admin (production)
export GOOGLE_APPLICATION_CREDENTIALS=""
export FIRESTORE_EMULATOR_HOST=""
export GCLOUD_PROJECT="$PROJECT_ID"

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