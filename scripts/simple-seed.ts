import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';

// Firebase config from your env
const firebaseConfig = {
  apiKey: "AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA",
  authDomain: "kudjo-affiliate.firebaseapp.com",
  projectId: "kudjo-affiliate",
  storageBucket: "kudjo-affiliate.appspot.com",
  messagingSenderId: "943798260444",
  appId: "1:943798260444:web:c8c2ce35ee63c639865a19",
  measurementId: "G-2JNJ612PZT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper functions
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Business data
const businessNames = [
  "Mario's Italian Bistro", "Taco Express", "Burger Palace", "Sushi Master", "Coffee Corner",
  "Pizza Place", "Thai Garden", "Steakhouse 55", "Noodle Bar", "Bakery Fresh", 
  "Indian Spice", "Mexican Grill", "Seafood Shack", "Chicken Coop", "Sandwich Shop",
  "Ice Cream Dreams", "Donut Delight", "Smoothie Station", "Salad Central", "BBQ Pit"
];

const influencerHandles = [
  "foodie_explorer", "taste_tester", "chef_wannabe", "hungry_blogger", "snack_attack",
  "food_critic", "meal_hunter", "dish_lover", "recipe_master", "flavor_seeker",
  "cooking_pro", "restaurant_hopper", "food_adventure", "taste_maker", "culinary_guide"
];

async function createSimpleData() {
  console.log('🚀 Creating simple seed data...');
  
  try {
    // Create 10 businesses
    console.log('Creating businesses...');
    const businessBatch = writeBatch(db);
    for (let i = 0; i < 10; i++) {
      const businessId = `biz_${i + 1}`;
      const businessRef = doc(db, 'businesses', businessId);
      
      businessBatch.set(businessRef, {
        id: businessId,
        name: businessNames[i] || `Business ${i + 1}`,
        address: `${randomInt(100, 999)} Main St, City ${i + 1}`,
        phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        cuisine: randomChoice(['Italian', 'Mexican', 'American', 'Asian', 'Mediterranean']),
        posIntegrated: Math.random() > 0.5,
        createdAt: new Date().toISOString(),
        ownerId: `user_biz_${i + 1}`,
        status: 'active'
      });
    }
    await businessBatch.commit();
    console.log('✅ Created 10 businesses');

    // Create 10 influencers
    console.log('Creating influencers...');
    const influencerBatch = writeBatch(db);
    for (let i = 0; i < 10; i++) {
      const influencerId = `inf_${i + 1}`;
      const influencerRef = doc(db, 'influencers', influencerId);
      
      influencerBatch.set(influencerRef, {
        id: influencerId,
        handle: influencerHandles[i] || `influencer_${i + 1}`,
        name: `Influencer ${i + 1}`,
        followers: randomInt(1000, 100000),
        avgViews: randomInt(500, 50000),
        tier: randomChoice(['Bronze', 'Silver', 'Gold']),
        createdAt: new Date().toISOString(),
        ownerId: `user_inf_${i + 1}`,
        status: 'active'
      });
    }
    await influencerBatch.commit();
    console.log('✅ Created 10 influencers');

    // Create some offers
    console.log('Creating offers...');
    const offerBatch = writeBatch(db);
    for (let i = 0; i < 5; i++) {
      const offerId = `off_${i + 1}`;
      const offerRef = doc(db, 'offers', offerId);
      
      offerBatch.set(offerRef, {
        id: offerId,
        businessId: `biz_${(i % 10) + 1}`,
        title: `Great Deal ${i + 1}`,
        description: `Amazing offer for customers ${i + 1}`,
        discountPercent: randomInt(10, 50),
        maxRedemptions: randomInt(50, 200),
        currentRedemptions: randomInt(0, 20),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        status: 'active'
      });
    }
    await offerBatch.commit();
    console.log('✅ Created 5 offers');

    // Create admin user in users collection
    console.log('Creating admin user...');
    const adminRef = doc(db, 'users', 'admin_user');
    await setDoc(adminRef, {
      id: 'admin_user',
      email: 'devon@getkudjo.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Created admin user');

    console.log('\n🎉 Simple seed data created successfully!');
    console.log('📊 Created:');
    console.log('  - 10 businesses');
    console.log('  - 10 influencers');
    console.log('  - 5 offers');
    console.log('  - 1 admin user');
    
  } catch (error) {
    console.error('❌ Error creating seed data:', error);
    throw error;
  }
}

// Run the seed
createSimpleData()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  }); 