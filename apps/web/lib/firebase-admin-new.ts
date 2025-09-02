import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Firebase Admin instances
let firebaseApp: App | null = null;
let firebaseDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let isInitialized = false;
let initError: string | null = null;

// Connection health tracking
let lastHealthCheck = 0;
let isHealthy = false;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Initialize Firebase Admin
async function initializeFirebase(): Promise<boolean> {
  if (isInitialized && firebaseApp && firebaseDb) {
    return true;
  }

  try {
    // Check if Firebase Admin is already initialized
    if (getApps().length === 0) {
      let credentialsFound = false;

      // Method 1: Environment variables
      const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const envProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      
      if (envPrivateKey && envClientEmail && envProjectId) {
        try {
          firebaseApp = initializeApp({
            credential: cert({
              projectId: envProjectId,
              clientEmail: envClientEmail,
              privateKey: envPrivateKey
            })
          });
          credentialsFound = true;
          console.log('✅ Firebase Admin initialized from environment variables');
        } catch (error) {
          console.error('❌ Failed to initialize with env credentials:', error);
        }
      }

      // Method 2: GOOGLE_APPLICATION_CREDENTIALS
      if (!credentialsFound) {
        const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (gacPath && fs.existsSync(gacPath)) {
          try {
            const serviceAccount = JSON.parse(fs.readFileSync(gacPath, 'utf-8'));
            firebaseApp = initializeApp({ credential: cert(serviceAccount) });
            credentialsFound = true;
            console.log('✅ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS');
          } catch (error) {
            console.error('❌ Failed to initialize with GAC:', error);
          }
        }
      }

      // Method 3: Local service account files
      if (!credentialsFound) {
        const candidates = [
          path.resolve(process.cwd(), 'service-account.json'),
          path.resolve(process.cwd(), 'scripts/firebase-service-account.json'),
          path.resolve(process.cwd(), 'apps/web/service-account.json'),
        ];
        
        for (const filePath of candidates) {
          if (fs.existsSync(filePath)) {
            try {
              const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              
              // Validate service account structure
              if (serviceAccount.private_key && 
                  serviceAccount.client_email && 
                  serviceAccount.project_id &&
                  !serviceAccount.private_key.includes('REPLACE_THIS')) {
                
                firebaseApp = initializeApp({ credential: cert(serviceAccount) });
                credentialsFound = true;
                console.log('✅ Firebase Admin initialized from:', path.basename(filePath));
                break;
              } else {
                console.warn('⚠️ Invalid service account file:', path.basename(filePath));
              }
            } catch (error) {
              console.error('❌ Failed to read service account file:', path.basename(filePath), error);
            }
          }
        }
      }

      if (!credentialsFound) {
        initError = 'No valid Firebase credentials found';
        console.error('❌ Firebase Admin initialization failed: No valid credentials found');
        console.log('💡 Please ensure one of the following is configured:');
        console.log('   1. Environment variables: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
        console.log('   2. GOOGLE_APPLICATION_CREDENTIALS pointing to service account file');
        console.log('   3. service-account.json file in project root');
        return false;
      }
    } else {
      firebaseApp = getApps()[0];
      console.log('✅ Firebase Admin already initialized');
    }

    // Initialize Firestore and Auth
    if (firebaseApp) {
      firebaseDb = getFirestore(firebaseApp);
      firebaseAuth = getAuth(firebaseApp);
      isInitialized = true;
      initError = null;
      
      // Test connection
      await testConnection();
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    initError = errorMessage;
    console.error('❌ Firebase Admin initialization failed:', errorMessage);
    firebaseApp = null;
    firebaseDb = null;
    firebaseAuth = null;
    isInitialized = false;
  }

  return false;
}

// Test Firebase connection health
async function testConnection(): Promise<boolean> {
  if (!firebaseDb) return false;

  try {
    // Simple test query to verify connection
    await firebaseDb.collection('_health_check').limit(1).get();
    isHealthy = true;
    lastHealthCheck = Date.now();
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    isHealthy = false;
    return false;
  }
}

// Get Firebase Admin DB with health check
async function getFirebaseDb(): Promise<Firestore | null> {
  // Check if we need to initialize
  if (!isInitialized) {
    const success = await initializeFirebase();
    if (!success) return null;
  }

  // Check connection health
  const now = Date.now();
  if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    await testConnection();
  }

  return isHealthy ? firebaseDb : null;
}

// Get Firebase Admin Auth
async function getFirebaseAuth(): Promise<Auth | null> {
  if (!isInitialized) {
    const success = await initializeFirebase();
    if (!success) return null;
  }
  return firebaseAuth;
}

// Synchronous getters for backward compatibility
const adminDb = firebaseDb;
const adminAuth = firebaseAuth;

// Get initialization status
function getFirebaseStatus() {
  return {
    initialized: isInitialized,
    healthy: isHealthy,
    error: initError,
    lastHealthCheck: new Date(lastHealthCheck).toISOString()
  };
}

// Initialize on module load
initializeFirebase().catch(console.error);

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

export { 
  adminDb,
  adminAuth,
  getFirebaseDb,
  getFirebaseAuth,
  getFirebaseStatus,
  generateMockUsers, 
  generateMockCoupons 
};
