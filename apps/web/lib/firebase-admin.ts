import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
let adminDb: any;

let initialized = false;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    // First, try env-provided credentials
    const envPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const envProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (envPrivateKey && envClientEmail && envProjectId) {
      initializeApp({ credential: cert({ projectId: envProjectId, clientEmail: envClientEmail, privateKey: envPrivateKey }) });
      initialized = true;
      console.log('Firebase Admin initialized from env credentials');
    }

    if (!initialized) {
      // Next, try GOOGLE_APPLICATION_CREDENTIALS
      const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (gacPath && fs.existsSync(gacPath)) {
        const sa = JSON.parse(fs.readFileSync(gacPath, 'utf-8'));
        initializeApp({ credential: cert(sa) });
        initialized = true;
        console.log('Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS');
      }
    }

    if (!initialized) {
      // Finally, try common local files in repo
      const candidates = [
        path.resolve(process.cwd(), 'scripts/firebase-service-account.json'),
        path.resolve(process.cwd(), 'service-account.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const sa = JSON.parse(fs.readFileSync(p, 'utf-8'));
          // Check if it's a real service account (not placeholder)
          if (sa.private_key && !sa.private_key.includes('REPLACE_THIS')) {
            initializeApp({ credential: cert(sa) });
            initialized = true;
            console.log('Firebase Admin initialized from local service account file:', path.basename(p));
            break;
          } else {
            console.log('Service account file contains placeholder values, skipping:', path.basename(p));
          }
        }
      }
    }

    if (!initialized) {
      console.log('Firebase Admin credentials not configured - will use mock data fallback');
      // Don't throw error, just set adminDb to null for fallback
    }
  } else {
    initialized = true; // Already initialized
  }
  
  if (initialized) {
    adminDb = getFirestore();
  }
  
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