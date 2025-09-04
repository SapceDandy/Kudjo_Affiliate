#!/bin/bash

# Kudjo Affiliate Production Deployment Script
# Based on INSTRUCTIONS.md Section 17

set -e

echo "🚀 Starting Kudjo Affiliate Production Deployment"

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ required. Current: $(node --version)"
    exit 1
fi

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with: npm i -g firebase-tools"
    exit 1
fi

# Check if logged into Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged into Firebase. Run: firebase login"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Set Firebase project
echo "🔧 Setting Firebase project..."
firebase use kudjo-affiliate

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build Next.js app
echo "🏗️  Building Next.js application..."
cd apps/web
npm run build
cd ../..

# Build Functions
echo "⚡ Building Firebase Functions..."
cd functions
npm install
npm run build
cd ..

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --only functions,firestore,hosting

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your app should be available at:"
echo "   https://kudjo-affiliate.web.app"
echo "   https://kudjo-affiliate.firebaseapp.com"
echo ""
echo "🔧 Don't forget to:"
echo "   1. Set environment variables in Firebase Functions config"
echo "   2. Update Firebase Auth authorized domains"
echo "   3. Configure Firestore security rules"
echo "   4. Set up monitoring and alerts"
