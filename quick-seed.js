const admin = require('firebase-admin');

// Initialize Firebase Admin with your project
admin.initializeApp({
  projectId: 'kudjo-affiliate'
});

const db = admin.firestore();

const seedData = {
  businesses: {
    'biz_1': {
      id: 'biz_1',
      name: "Mario's Italian Bistro",
      address: '123 Main St, Downtown',
      phone: '555-123-4567',
      cuisine: 'Italian',
      posIntegrated: true,
      createdAt: '2025-08-18T09:00:00.000Z',
      ownerId: 'user_biz_1',
      status: 'active'
    },
    'biz_2': {
      id: 'biz_2',
      name: 'Taco Express',
      address: '456 Oak Ave, Midtown',
      phone: '555-234-5678',
      cuisine: 'Mexican',
      posIntegrated: false,
      createdAt: '2025-08-18T09:00:00.000Z',
      ownerId: 'user_biz_2',
      status: 'active'
    },
    'biz_3': {
      id: 'biz_3',
      name: 'Burger Palace',
      address: '789 Pine St, Uptown',
      phone: '555-345-6789',
      cuisine: 'American',
      posIntegrated: true,
      createdAt: '2025-08-18T09:00:00.000Z',
      ownerId: 'user_biz_3',
      status: 'active'
    }
  },
  influencers: {
    'inf_1': {
      id: 'inf_1',
      handle: 'foodie_explorer',
      name: 'Sarah Johnson',
      followers: 25000,
      avgViews: 12000,
      tier: 'Silver',
      createdAt: '2025-08-18T09:00:00.000Z',
      ownerId: 'user_inf_1',
      status: 'active'
    },
    'inf_2': {
      id: 'inf_2',
      handle: 'taste_tester',
      name: 'Mike Chen',
      followers: 85000,
      avgViews: 35000,
      tier: 'Gold',
      createdAt: '2025-08-18T09:00:00.000Z',
      ownerId: 'user_inf_2',
      status: 'active'
    }
  },
  users: {
    'admin_user': {
      id: 'admin_user',
      email: 'devon@getkudjo.com',
      role: 'admin',
      createdAt: '2025-08-18T09:00:00.000Z',
      status: 'active'
    },
    'user_biz_1': {
      id: 'user_biz_1',
      email: 'mario@italianbistro.com',
      role: 'business',
      createdAt: '2025-08-18T09:00:00.000Z',
      status: 'active'
    },
    'user_inf_1': {
      id: 'user_inf_1',
      email: 'sarah@foodieexplorer.com',
      role: 'influencer',
      createdAt: '2025-08-18T09:00:00.000Z',
      status: 'active'
    }
  },
  offers: {
    'off_1': {
      id: 'off_1',
      businessId: 'biz_1',
      title: '20% Off Italian Dinner',
      description: 'Get 20% off any dinner entree',
      discountPercent: 20,
      maxRedemptions: 100,
      currentRedemptions: 5,
      startDate: '2025-08-18T09:00:00.000Z',
      endDate: '2025-09-18T09:00:00.000Z',
      createdAt: '2025-08-18T09:00:00.000Z',
      status: 'active'
    }
  }
};

async function seedDatabase() {
  console.log('🚀 Starting quick seed...');
  
  try {
    // Create each collection
    for (const [collectionName, documents] of Object.entries(seedData)) {
      console.log(`Creating ${collectionName}...`);
      
      const batch = db.batch();
      
      for (const [docId, docData] of Object.entries(documents)) {
        const docRef = db.collection(collectionName).doc(docId);
        batch.set(docRef, docData);
      }
      
      await batch.commit();
      console.log(`✅ Created ${Object.keys(documents).length} documents in ${collectionName}`);
    }
    
    console.log('\n🎉 Seed data created successfully!');
    console.log('📊 Summary:');
    console.log('  - 3 businesses');
    console.log('  - 2 influencers');
    console.log('  - 3 users');
    console.log('  - 1 offer');
    console.log('\nYou can now:');
    console.log('  - Start your dev server: npm run dev');
    console.log('  - Visit admin portal: http://localhost:3000/admin');
    console.log('  - Login with: devon@getkudjo.com / 1234567890!Dd');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase(); 