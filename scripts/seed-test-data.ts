#!/usr/bin/env tsx

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccountPath = join(process.cwd(), 'service-account.json');
let serviceAccount;

try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('Error reading service account file:', error);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // Create test businesses
    const businesses = [
      {
        id: 'biz-golden-spoon',
        name: 'The Golden Spoon',
        businessName: 'The Golden Spoon',
        address: '123 Main St, Downtown',
        phone: '(555) 123-4567',
        cuisine: 'American',
        createdAt: new Date(),
      },
      {
        id: 'biz-urban-eats',
        name: 'Urban Eats',
        businessName: 'Urban Eats',
        address: '456 Oak Ave, Midtown',
        phone: '(555) 234-5678',
        cuisine: 'International',
        createdAt: new Date(),
      },
      {
        id: 'biz-cafe-nouveau',
        name: 'Cafe Nouveau',
        businessName: 'Cafe Nouveau',
        address: '789 Pine St, Arts District',
        phone: '(555) 345-6789',
        cuisine: 'French',
        createdAt: new Date(),
      },
    ];

    // Create test offers
    const offers = [
      {
        id: 'offer-golden-spoon-1',
        bizId: 'biz-golden-spoon',
        title: 'Weekend Brunch Special',
        description: 'Get 20% off our signature brunch menu every weekend. Perfect for food content creators!',
        active: true,
        splitPct: 25,
        discountType: 'percentage',
        userDiscountPct: 20,
        minSpendCents: 2500, // $25
        maxInfluencers: 50,
        maxRedemptions: 1000,
        eligibility: {
          tiers: ['S', 'M', 'L', 'XL', 'Huge'],
        },
        endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: new Date(),
      },
      {
        id: 'offer-urban-eats-1',
        bizId: 'biz-urban-eats',
        title: 'Fusion Friday Deal',
        description: 'Try our new fusion menu with 15% off. Great for diverse food content!',
        active: true,
        splitPct: 20,
        discountType: 'percentage',
        userDiscountPct: 15,
        minSpendCents: 3000, // $30
        maxInfluencers: 30,
        maxRedemptions: 500,
        eligibility: {
          tiers: ['M', 'L', 'XL', 'Huge'],
        },
        endAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        createdAt: new Date(),
      },
      {
        id: 'offer-cafe-nouveau-1',
        bizId: 'biz-cafe-nouveau',
        title: 'Artisan Coffee Experience',
        description: '$10 off any order over $40. Perfect for coffee and pastry content!',
        active: true,
        splitPct: 30,
        discountType: 'fixed',
        userDiscountCents: 1000, // $10
        minSpendCents: 4000, // $40
        maxInfluencers: 25,
        maxRedemptions: 300,
        eligibility: {
          tiers: ['S', 'M', 'L'],
        },
        endAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        createdAt: new Date(),
      },
    ];

    // Create test influencers
    const influencers = [
      {
        id: 'demo-influencer-123',
        name: 'Demo Influencer',
        handle: 'demo_foodie',
        tier: 'M',
        followers: 25000,
        email: 'demo@example.com',
        createdAt: new Date(),
      },
    ];

    // Batch write all data
    const batch = db.batch();

    // Add businesses
    businesses.forEach(business => {
      const ref = db.collection('businesses').doc(business.id);
      batch.set(ref, business);
    });

    // Add offers
    offers.forEach(offer => {
      const ref = db.collection('offers').doc(offer.id);
      batch.set(ref, offer);
    });

    // Add influencers
    influencers.forEach(influencer => {
      const ref = db.collection('influencers').doc(influencer.id);
      batch.set(ref, influencer);
    });

    await batch.commit();

    console.log('✅ Test data seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - ${businesses.length} businesses`);
    console.log(`   - ${offers.length} offers`);
    console.log(`   - ${influencers.length} influencers`);
    
    console.log('\n🔗 Test URLs:');
    console.log('   - Available campaigns: http://localhost:3000/api/influencer/available-campaigns?infId=demo-influencer-123');
    console.log('   - Influencer page: http://localhost:3000/influencer');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

seedTestData().then(() => {
  console.log('🎉 Seeding complete!');
  process.exit(0);
});
