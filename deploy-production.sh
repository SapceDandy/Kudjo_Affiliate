#!/bin/bash

# Kudjo Affiliate - Production Deployment Script
# This script deploys the complete Kudjo Affiliate platform to production

set -e  # Exit on any error

echo "🚀 Starting Kudjo Affiliate Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "firebase.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if environment files exist
if [ ! -f "apps/web/.env.local" ]; then
    print_error "Missing apps/web/.env.local file. Please create it with your Firebase credentials."
    exit 1
fi

if [ ! -f "functions/.env" ]; then
    print_error "Missing functions/.env file. Please create it with your function environment variables."
    exit 1
fi

print_status "Environment files found"

# Step 2: Build and test
echo "🔨 Building and testing..."

# Install dependencies
npm install

# Run TypeScript check
npm run typecheck
print_status "TypeScript compilation passed"

# Run tests
npm run test:unit
print_status "All tests passed"

# Build the application
npm run build
print_status "Build completed successfully"

# Step 3: Firebase deployment
echo "🔥 Deploying to Firebase..."

# Check Firebase authentication
if ! firebase projects:list > /dev/null 2>&1; then
    print_warning "Firebase authentication required. Please run: firebase login"
    read -p "Press Enter after you've authenticated with Firebase..."
fi

# Deploy Firestore rules and indexes
echo "📊 Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes
print_status "Firestore rules and indexes deployed"

# Deploy Cloud Functions
echo "⚡ Deploying Cloud Functions..."
firebase deploy --only functions
print_status "Cloud Functions deployed"

# Step 4: Vercel deployment
echo "🌐 Deploying to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to Vercel
vercel --prod
print_status "Application deployed to Vercel"

# Step 5: Post-deployment verification
echo "🔍 Running post-deployment verification..."

print_status "Deployment completed successfully!"

echo ""
echo "🎉 Kudjo Affiliate has been deployed to production!"
echo ""
echo "📋 Next Steps:"
echo "1. Verify your Vercel domain is working"
echo "2. Test admin login at your-domain.com/control-center/login"
echo "3. Create test business and influencer accounts"
echo "4. Verify all API endpoints are responding"
echo "5. Set up monitoring and error tracking"
echo ""
echo "📚 For detailed verification steps, see PRODUCTION_DEPLOYMENT_GUIDE.md"
echo ""
print_status "Deployment script completed!"
