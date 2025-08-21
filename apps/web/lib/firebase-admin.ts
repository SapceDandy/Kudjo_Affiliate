import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
let adminDb: any;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    // Try to use service account from environment variables
    const serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kudjo-affiliate",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-xxxxx@kudjo-affiliate.iam.gserviceaccount.com",
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    };
    
    initializeApp({
      credential: cert(serviceAccount)
    });
    
    console.log("Firebase Admin initialized successfully");
  }
  
  adminDb = getFirestore();
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
  adminDb = null;
}

// Generate mock data for development
const generateMockUsers = (count = 20) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i+1}`,
    email: `user${i+1}@example.com`,
    displayName: `User ${i+1}`,
    role: i % 3 === 0 ? 'business' : (i % 3 === 1 ? 'influencer' : 'admin'),
    photoURL: null,
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  }));
};

const generateMockCoupons = (count = 10) => {
  const businessNames = [
    'Cafe Delight', 
    'Urban Fitness', 
    'Tech Solutions', 
    'Green Grocers', 
    'Fashion Forward'
  ];
  
  const influencerNames = [
    'Alex Style', 
    'Fitness Journey', 
    'Tech Reviews', 
    'Food Explorer', 
    'Travel With Me',
    'Lifestyle Pro',
    'Beauty Tips',
    'Gaming Master',
    'Health Coach',
    'DIY Expert'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const bizIndex = Math.floor(Math.random() * businessNames.length);
    const infIndex = Math.floor(Math.random() * influencerNames.length);
    const bizId = `biz-${bizIndex + 1}`;
    const infId = `inf-${infIndex + 1}`;
    
    return {
      id: `coupon-${i+1}`,
      code: `AFFILIATE${i+1}`,
      type: 'AFFILIATE',
      bizId: bizId,
      infId: infId,
      businessName: businessNames[bizIndex],
      influencerName: influencerNames[infIndex],
      offerId: `offer-${Math.floor(Math.random() * 5) + 1}`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      used: Math.random() > 0.7
    };
  });
};

export { adminDb, generateMockUsers, generateMockCoupons }; 