#!/usr/bin/env node

// Simple script to add test data using Firebase emulator
const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, collection, addDoc, doc, setDoc } = require('firebase/firestore');

// Initialize Firebase for emulator
const firebaseConfig = {
  projectId: 'kudjo-affiliate',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
} catch (error) {
  console.log('Emulator already connected or not running');
}

async function seedEmulatorData() {
  console.log('🌱 Adding test data to Firebase emulator...');

  try {
    // Create test businesses
    const businesses = [
      {
        name: 'The Golden Spoon',
        businessName: 'The Golden Spoon',
        address: '123 Main St, Downtown',
        phone: '(555) 123-4567',
        cuisine: 'American',
        createdAt: new Date(),
      },
      {
        name: 'Urban Eats',
        businessName: 'Urban Eats',
        address: '456 Oak Ave, Midtown',
        phone: '(555) 234-5678',
        cuisine: 'International',
        createdAt: new Date(),
      },
      {
        name: 'Cafe Nouveau',
        businessName: 'Cafe Nouveau',
        address: '789 Pine St, Arts District',
        phone: '(555) 345-6789',
        cuisine: 'French',
        createdAt: new Date(),
      },
    ];

    // Add businesses
    const businessIds = [];
    for (const business of businesses) {
      const docRef = await addDoc(collection(db, 'businesses'), business);
      businessIds.push(docRef.id);
      console.log(`✅ Added business: ${business.name} (${docRef.id})`);
    }

    // Create test offers
    const offers = [
      {
        bizId: businessIds[0],
        title: 'Weekend Brunch Special',
        description: 'Get 20% off our signature brunch menu every weekend. Perfect for food content creators!',
        active: true,
        splitPct: 25,
        discountType: 'percentage',
        userDiscountPct: 20,
        minSpendCents: 2500,
        maxInfluencers: 50,
        maxRedemptions: 1000,
        eligibility: {
          tiers: ['S', 'M', 'L', 'XL', 'Huge'],
        },
        endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      {
        bizId: businessIds[1],
        title: 'Fusion Friday Deal',
        description: 'Try our new fusion menu with 15% off. Great for diverse food content!',
        active: true,
        splitPct: 20,
        discountType: 'percentage',
        userDiscountPct: 15,
        minSpendCents: 3000,
        maxInfluencers: 30,
        maxRedemptions: 500,
        eligibility: {
          tiers: ['M', 'L', 'XL', 'Huge'],
        },
        endAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      {
        bizId: businessIds[2],
        title: 'Artisan Coffee Experience',
        description: '$10 off any order over $40. Perfect for coffee and pastry content!',
        active: true,
        splitPct: 30,
        discountType: 'fixed',
        userDiscountCents: 1000,
        minSpendCents: 4000,
        maxInfluencers: 25,
        maxRedemptions: 300,
        eligibility: {
          tiers: ['S', 'M', 'L'],
        },
        endAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    ];

    // Add offers
    for (const offer of offers) {
      const docRef = await addDoc(collection(db, 'offers'), offer);
      console.log(`✅ Added offer: ${offer.title} (${docRef.id})`);
    }

    // Create test influencer
    await setDoc(doc(db, 'influencers', 'demo-influencer-123'), {
      name: 'Demo Influencer',
      handle: 'demo_foodie',
      tier: 'M',
      followers: 25000,
      email: 'demo@example.com',
      createdAt: new Date(),
    });
    console.log('✅ Added demo influencer');

    console.log('\n🎉 Test data added successfully!');
    console.log('📊 Created:');
    console.log(`   - ${businesses.length} businesses`);
    console.log(`   - ${offers.length} offers`);
    console.log(`   - 1 influencer`);

  } catch (error) {
    console.error('❌ Error adding test data:', error);
  }
}

seedEmulatorData();
