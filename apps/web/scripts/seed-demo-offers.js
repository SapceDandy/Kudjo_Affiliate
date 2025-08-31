const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('service-account.json not found. Please add your Firebase service account key.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

const demoOffers = [
  {
    title: "Buy One Get One Free Fitness",
    description: "Order any entree and get a second one free",
    bizId: "demo_biz_1",
    splitPct: 25,
    userDiscountPct: 50,
    minSpendCents: 2500,
    active: true,
    discountType: "percentage",
    maxInfluencers: 10,
    maxRedemptions: 100,
    eligibility: { tiers: ["S", "M", "L"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  {
    title: "20% Off Any Entree",
    description: "Enjoy 20% off your meal at Demo Bistro",
    bizId: "demo_biz_1",
    splitPct: 20,
    userDiscountPct: 20,
    minSpendCents: 1500,
    active: true,
    discountType: "percentage",
    maxInfluencers: 15,
    maxRedemptions: 200,
    eligibility: { tiers: ["S", "M", "L", "XL"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Free Appetizer with Entree",
    description: "Get a free appetizer when you order any entree",
    bizId: "demo_biz_2",
    splitPct: 30,
    userDiscountCents: 800,
    minSpendCents: 2000,
    active: true,
    discountType: "fixed",
    maxInfluencers: 8,
    maxRedemptions: 50,
    eligibility: { tiers: ["M", "L", "XL"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Coffee & Pastry Combo Deal",
    description: "Buy any coffee and get a pastry for 50% off",
    bizId: "demo_biz_3",
    splitPct: 15,
    userDiscountPct: 50,
    minSpendCents: 1000,
    active: true,
    discountType: "percentage",
    maxInfluencers: 20,
    maxRedemptions: 300,
    eligibility: { tiers: ["S", "M"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Happy Hour Special",
    description: "30% off all drinks during happy hour (4-6 PM)",
    bizId: "demo_biz_4",
    splitPct: 25,
    userDiscountPct: 30,
    minSpendCents: 1200,
    active: true,
    discountType: "percentage",
    maxInfluencers: 12,
    maxRedemptions: 150,
    eligibility: { tiers: ["S", "M", "L"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Weekend Brunch Special",
    description: "Free mimosa with any brunch entree on weekends",
    bizId: "demo_biz_5",
    splitPct: 35,
    userDiscountCents: 1200,
    minSpendCents: 2500,
    active: true,
    discountType: "fixed",
    maxInfluencers: 6,
    maxRedemptions: 80,
    eligibility: { tiers: ["L", "XL", "Huge"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Student Discount Special",
    description: "15% off for students with valid ID",
    bizId: "demo_biz_6",
    splitPct: 18,
    userDiscountPct: 15,
    minSpendCents: 800,
    active: true,
    discountType: "percentage",
    maxInfluencers: 25,
    maxRedemptions: 500,
    eligibility: { tiers: ["S", "M", "L"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Family Meal Deal",
    description: "Feed a family of 4 for $39.99",
    bizId: "demo_biz_7",
    splitPct: 22,
    userDiscountCents: 1000,
    minSpendCents: 3999,
    active: true,
    discountType: "fixed",
    maxInfluencers: 10,
    maxRedemptions: 100,
    eligibility: { tiers: ["M", "L", "XL"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Dessert on the House",
    description: "Free dessert with any dinner entree",
    bizId: "demo_biz_8",
    splitPct: 28,
    userDiscountCents: 600,
    minSpendCents: 2200,
    active: true,
    discountType: "fixed",
    maxInfluencers: 15,
    maxRedemptions: 120,
    eligibility: { tiers: ["S", "M", "L", "XL"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Lunch Express Deal",
    description: "Quick lunch combo for $12.99",
    bizId: "demo_biz_9",
    splitPct: 20,
    userDiscountCents: 300,
    minSpendCents: 1299,
    active: true,
    discountType: "fixed",
    maxInfluencers: 30,
    maxRedemptions: 400,
    eligibility: { tiers: ["S", "M"] },
    createdAt: new Date(),
    endAt: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000)
  }
];

const demoBusinesses = [
  { id: "demo_biz_1", name: "Demo Bistro", address: "123 Main St", phone: "(555) 123-4567" },
  { id: "demo_biz_2", name: "Sunset Grill", address: "456 Oak Ave", phone: "(555) 234-5678" },
  { id: "demo_biz_3", name: "Morning Brew Cafe", address: "789 Pine St", phone: "(555) 345-6789" },
  { id: "demo_biz_4", name: "Downtown Tavern", address: "321 Elm St", phone: "(555) 456-7890" },
  { id: "demo_biz_5", name: "Brunch & Co", address: "654 Maple Ave", phone: "(555) 567-8901" },
  { id: "demo_biz_6", name: "Campus Eats", address: "987 University Dr", phone: "(555) 678-9012" },
  { id: "demo_biz_7", name: "Family Kitchen", address: "147 Cedar St", phone: "(555) 789-0123" },
  { id: "demo_biz_8", name: "Sweet Endings", address: "258 Birch Ave", phone: "(555) 890-1234" },
  { id: "demo_biz_9", name: "Quick Bites", address: "369 Spruce St", phone: "(555) 901-2345" }
];

async function seedDemoData() {
  try {
    console.log('Starting demo data seeding...');

    // Seed businesses first
    console.log('Seeding businesses...');
    for (const business of demoBusinesses) {
      await db.collection('businesses').doc(business.id).set({
        id: business.id,
        ownerId: 'demo_business_user',
        name: business.name,
        businessName: business.name,
        address: business.address,
        phone: business.phone,
        status: 'active',
        defaultSplitPct: 20,
        posProvider: 'manual',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✓ Created business: ${business.name}`);
    }

    // Seed offers
    console.log('Seeding offers...');
    for (const offer of demoOffers) {
      const docRef = await db.collection('offers').add(offer);
      console.log(`✓ Created offer: ${offer.title} (ID: ${docRef.id})`);
    }

    console.log('✅ Demo data seeding completed successfully!');
    console.log(`Created ${demoBusinesses.length} businesses and ${demoOffers.length} offers`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
}

seedDemoData().then(() => {
  console.log('Seeding process finished.');
  process.exit(0);
});
