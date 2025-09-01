import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Firebase emulators...');
  
  // Start Firebase emulators in background
  execSync('firebase emulators:start --only auth,firestore,functions --detach', {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  // Wait for emulators to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🌱 Seeding test data...');
  
  // Run seed script for test data
  execSync('npm run seed:test', {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  console.log('✅ Test environment ready');
}

export default globalSetup;
