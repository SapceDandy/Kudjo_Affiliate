/**
 * Environment variable validation for Firebase Admin SDK
 */

export interface FirebaseEnvConfig {
  privateKey?: string;
  clientEmail?: string;
  projectId?: string;
  googleApplicationCredentials?: string;
}

export function validateFirebaseEnv(): {
  isValid: boolean;
  config: FirebaseEnvConfig;
  errors: string[];
} {
  const errors: string[] = [];
  const config: FirebaseEnvConfig = {};

  // Check environment variables
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  config.privateKey = privateKey;
  config.clientEmail = clientEmail;
  config.projectId = projectId;
  config.googleApplicationCredentials = gacPath;

  // Validation logic
  const hasEnvCredentials = privateKey && clientEmail && projectId;
  const hasGacCredentials = gacPath;

  if (!hasEnvCredentials && !hasGacCredentials) {
    errors.push('No Firebase credentials found. Please set either:');
    errors.push('  1. FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
    errors.push('  2. GOOGLE_APPLICATION_CREDENTIALS pointing to service account file');
  }

  if (privateKey && privateKey.includes('REPLACE_THIS')) {
    errors.push('FIREBASE_PRIVATE_KEY contains placeholder value');
  }

  if (clientEmail && clientEmail.includes('REPLACE_THIS')) {
    errors.push('FIREBASE_CLIENT_EMAIL contains placeholder value');
  }

  if (projectId && projectId.includes('REPLACE_THIS')) {
    errors.push('FIREBASE_PROJECT_ID contains placeholder value');
  }

  return {
    isValid: errors.length === 0,
    config,
    errors
  };
}

export function logFirebaseEnvStatus(): void {
  const validation = validateFirebaseEnv();
  
  if (validation.isValid) {
    console.log('✅ Firebase environment variables validated successfully');
    if (validation.config.privateKey && validation.config.clientEmail) {
      console.log('   Using environment variables for Firebase Admin');
    } else if (validation.config.googleApplicationCredentials) {
      console.log('   Using GOOGLE_APPLICATION_CREDENTIALS for Firebase Admin');
    }
  } else {
    console.error('❌ Firebase environment validation failed:');
    validation.errors.forEach(error => console.error(`   ${error}`));
  }
}
