import { z } from 'zod';

const envSchema = z.object({
  // Firebase Configuration
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  
  // Google OAuth
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
  
  // Admin Authentication
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSCODE: z.string().min(8),
  
  // App Configuration
  NEXT_PUBLIC_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Export individual variables for convenience
export const {
  NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  ADMIN_EMAIL,
  ADMIN_PASSCODE,
  NEXT_PUBLIC_MAPS_API_KEY,
  NEXT_PUBLIC_GA_ID,
  NODE_ENV,
} = env; 