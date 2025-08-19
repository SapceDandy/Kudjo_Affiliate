const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, connectFirestoreEmulator } = require('firebase/firestore');

// Firebase config
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

// Connect to the emulator
connectFirestoreEmulator(db, 'localhost', 8080);

async function addData() {
  try {
    // Add users
    await setDoc(doc(db, "users", "admin_user"), {
      id: "admin_user",
      email: "devon@getkudjo.com",
      role: "admin",
      createdAt: new Date().toISOString(),
      status: "active"
    });
    console.log("✅ Added admin user");

    await setDoc(doc(db, "users", "user_biz_1"), {
      id: "user_biz_1",
      email: "mario@restaurant.com",
      role: "business",
      createdAt: new Date().toISOString(),
      status: "active"
    });

    await setDoc(doc(db, "users", "user_inf_1"), {
      id: "user_inf_1",
      email: "sarah@foodie.com",
      role: "influencer",
      createdAt: new Date().toISOString(),
      status: "active"
    });
    console.log("✅ Added users");

    // Add businesses
    await setDoc(doc(db, "businesses", "biz_1"), {
      id: "biz_1",
      name: "Mario's Italian Bistro",
      address: "123 Main St, Downtown",
      phone: "555-123-4567",
      cuisine: "Italian",
      posIntegrated: true,
      createdAt: new Date().toISOString(),
      ownerId: "user_biz_1",
      status: "active"
    });

    await setDoc(doc(db, "businesses", "biz_2"), {
      id: "biz_2",
      name: "Taco Express",
      address: "456 Oak Ave, Midtown",
      phone: "555-234-5678",
      cuisine: "Mexican",
      posIntegrated: false,
      createdAt: new Date().toISOString(),
      ownerId: "user_biz_2",
      status: "active"
    });
    console.log("✅ Added businesses");

    // Add influencers
    await setDoc(doc(db, "influencers", "inf_1"), {
      id: "inf_1",
      handle: "foodie_explorer",
      name: "Sarah Johnson",
      followers: 25000,
      avgViews: 12000,
      tier: "Silver",
      createdAt: new Date().toISOString(),
      ownerId: "user_inf_1",
      status: "active"
    });

    await setDoc(doc(db, "influencers", "inf_2"), {
      id: "inf_2",
      handle: "taste_tester",
      name: "Mike Chen",
      followers: 85000,
      avgViews: 35000,
      tier: "Gold",
      createdAt: new Date().toISOString(),
      ownerId: "user_inf_2",
      status: "active"
    });
    console.log("✅ Added influencers");

    // Add offers
    await setDoc(doc(db, "offers", "off_1"), {
      id: "off_1",
      businessId: "biz_1",
      title: "20% Off Italian Dinner",
      description: "Get 20% off any dinner entree",
      discountPercent: 20,
      maxRedemptions: 100,
      currentRedemptions: 5,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: "active"
    });
    console.log("✅ Added offers");

    // Add coupons
    await setDoc(doc(db, "coupons", "AFF-MAR-FOO-ABC123"), {
      id: "AFF-MAR-FOO-ABC123",
      type: "AFFILIATE",
      businessId: "biz_1",
      influencerId: "inf_1",
      offerId: "off_1",
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ACTIVE",
      posAdded: true,
      usageCount: 3,
      lastUsedAt: new Date().toISOString()
    });
    console.log("✅ Added coupons");

    console.log("🎉 All data added successfully to the emulator!");
    console.log("📋 Now you can test your app with this data.");
    console.log("🌐 Visit http://localhost:4000 to see the emulator UI");
    console.log("🔄 To use your app with the emulator, update your .env to include:");
    console.log("   NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true");
  } catch (error) {
    console.error("❌ Error:", error.message || error);
  }
}

addData(); 