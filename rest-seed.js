const fetch = require('node-fetch');

// Your Firebase project ID
const PROJECT_ID = 'kudjo-affiliate';

// Base URL for Firestore REST API
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Function to add a document to a collection
async function addDocument(collection, docId, data) {
  const url = `${BASE_URL}/${collection}/${docId}`;
  
  // Convert JavaScript object to Firestore fields format
  const firestoreData = {
    fields: {}
  };
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      firestoreData.fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      firestoreData.fields[key] = { integerValue: value };
    } else if (typeof value === 'boolean') {
      firestoreData.fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      firestoreData.fields[key] = { timestampValue: value.toISOString() };
    }
  }
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(firestoreData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add document: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error adding ${collection}/${docId}:`, error);
    throw error;
  }
}

async function seedData() {
  try {
    console.log('🚀 Starting data seeding...');
    
    // Add admin user
    await addDocument('users', 'admin_user', {
      id: 'admin_user',
      email: 'devon@getkudjo.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Added admin user');
    
    // Add business user
    await addDocument('users', 'user_biz_1', {
      id: 'user_biz_1',
      email: 'mario@restaurant.com',
      role: 'business',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    // Add influencer user
    await addDocument('users', 'user_inf_1', {
      id: 'user_inf_1',
      email: 'sarah@foodie.com',
      role: 'influencer',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Added users');
    
    // Add businesses
    await addDocument('businesses', 'biz_1', {
      id: 'biz_1',
      name: "Mario's Italian Bistro",
      address: '123 Main St, Downtown',
      phone: '555-123-4567',
      cuisine: 'Italian',
      posIntegrated: true,
      createdAt: new Date().toISOString(),
      ownerId: 'user_biz_1',
      status: 'active'
    });
    
    await addDocument('businesses', 'biz_2', {
      id: 'biz_2',
      name: 'Taco Express',
      address: '456 Oak Ave, Midtown',
      phone: '555-234-5678',
      cuisine: 'Mexican',
      posIntegrated: false,
      createdAt: new Date().toISOString(),
      ownerId: 'user_biz_2',
      status: 'active'
    });
    console.log('✅ Added businesses');
    
    // Add influencers
    await addDocument('influencers', 'inf_1', {
      id: 'inf_1',
      handle: 'foodie_explorer',
      name: 'Sarah Johnson',
      followers: 25000,
      avgViews: 12000,
      tier: 'Silver',
      createdAt: new Date().toISOString(),
      ownerId: 'user_inf_1',
      status: 'active'
    });
    
    await addDocument('influencers', 'inf_2', {
      id: 'inf_2',
      handle: 'taste_tester',
      name: 'Mike Chen',
      followers: 85000,
      avgViews: 35000,
      tier: 'Gold',
      createdAt: new Date().toISOString(),
      ownerId: 'user_inf_2',
      status: 'active'
    });
    console.log('✅ Added influencers');
    
    // Add offer
    await addDocument('offers', 'off_1', {
      id: 'off_1',
      businessId: 'biz_1',
      title: '20% Off Italian Dinner',
      description: 'Get 20% off any dinner entree',
      discountPercent: 20,
      maxRedemptions: 100,
      currentRedemptions: 5,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Added offers');
    
    // Add coupon
    await addDocument('coupons', 'AFF-MAR-FOO-ABC123', {
      id: 'AFF-MAR-FOO-ABC123',
      type: 'AFFILIATE',
      businessId: 'biz_1',
      influencerId: 'inf_1',
      offerId: 'off_1',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
      posAdded: true,
      usageCount: 3,
      lastUsedAt: new Date().toISOString()
    });
    console.log('✅ Added coupons');
    
    console.log('🎉 All data added successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

seedData(); 