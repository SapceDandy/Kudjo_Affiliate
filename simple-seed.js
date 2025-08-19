// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  writeBatch
} = require('firebase/firestore');
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA",
  authDomain: "kudjo-affiliate.firebaseapp.com",
  projectId: "kudjo-affiliate",
  storageBucket: "kudjo-affiliate.firebasestorage.app",
  messagingSenderId: "943798260444",
  appId: "1:943798260444:web:c8c2ce35ee63c639865a19",
  measurementId: "G-2JNJ612PZT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// First we need to create a user account and sign in
async function setupAuth() {
  try {
    // Create the admin user first
    console.log('👤 Creating admin user...');
    try {
      await createUserWithEmailAndPassword(auth, 'devon@getkudjo.com', '1234567890!Dd');
      console.log('✅ Admin user created');
      return true;
    } catch (createError) {
      // If user already exists, try to sign in
      if (createError.code === 'auth/email-already-in-use') {
        console.log('🔑 Admin user exists, signing in...');
        try {
          await signInWithEmailAndPassword(auth, 'devon@getkudjo.com', '1234567890!Dd');
          console.log('✅ Signed in successfully');
          return true;
        } catch (signInError) {
          console.error('❌ Error signing in:', signInError.message);
          return false;
        }
      } else {
        console.error('❌ Error creating admin user:', createError.message);
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Error in auth setup:', error.message);
    return false;
  }
}

// Add seed data to Firestore
async function seedData() {
  try {
    // First authenticate
    const authSuccess = await setupAuth();
    if (!authSuccess) {
      console.error('❌ Authentication failed. Cannot proceed with seeding data.');
      return;
    }
    
    console.log('🚀 Starting data seeding...');
    
    // Add users
    await setDoc(doc(db, 'users', 'admin_user'), {
      id: 'admin_user',
      email: 'devon@getkudjo.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Added admin user document');
    
    await setDoc(doc(db, 'users', 'user_biz_1'), {
      id: 'user_biz_1',
      email: 'mario@restaurant.com',
      role: 'business',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    await setDoc(doc(db, 'users', 'user_inf_1'), {
      id: 'user_inf_1',
      email: 'sarah@foodie.com',
      role: 'influencer',
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Added users');
    
    // Add businesses
    await setDoc(doc(db, 'businesses', 'biz_1'), {
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
    
    await setDoc(doc(db, 'businesses', 'biz_2'), {
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
    await setDoc(doc(db, 'influencers', 'inf_1'), {
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
    
    await setDoc(doc(db, 'influencers', 'inf_2'), {
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
    
    // Add offers
    await setDoc(doc(db, 'offers', 'off_1'), {
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
    
    // Add coupons
    await setDoc(doc(db, 'coupons', 'AFF-MAR-FOO-ABC123'), {
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
    console.log('📊 Created:');
    console.log('  - 3 users (1 admin, 1 business, 1 influencer)');
    console.log('  - 2 businesses');
    console.log('  - 2 influencers');
    console.log('  - 1 offer');
    console.log('  - 1 coupon');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.message || error);
  }
}

// Run the seed function
seedData(); 