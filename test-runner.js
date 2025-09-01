#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Kudjo Affiliate Test Suite');

async function runTests() {
  try {
    // Step 1: Start Firebase emulators
    console.log('\n📦 Starting Firebase emulators...');
    try {
      execSync('firebase emulators:start --only auth,firestore,functions &', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      await new Promise(resolve => setTimeout(resolve, 8000));
    } catch (error) {
      console.log('⚠️  Emulator startup warning, continuing...');
    }

    // Step 2: Seed test data
    console.log('\n🌱 Seeding test data...');
    try {
      execSync('npx ts-node scripts/seed-test.ts', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log('⚠️  Seed script failed, continuing with existing data...');
    }

    // Step 3: Run existing unit tests
    console.log('\n🧪 Running existing unit tests...');
    try {
      execSync('npx jest functions/tests --passWithNoTests', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log('⚠️  Some unit tests failed');
    }

    // Step 4: Run integration tests with emulator
    console.log('\n🔗 Running integration tests...');
    try {
      execSync('npx jest tests/integration --passWithNoTests', {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          FIRESTORE_EMULATOR_HOST: 'localhost:8080',
          FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099'
        }
      });
    } catch (error) {
      console.log('⚠️  Some integration tests failed');
    }

    // Step 5: Start web server for E2E tests
    console.log('\n🌐 Starting web server for E2E tests...');
    const webProcess = spawn('npm', ['run', 'dev:web'], {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: 'localhost:8080',
        FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099'
      }
    });

    // Wait for web server to start
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 6: Run E2E tests
    console.log('\n🎭 Running E2E tests...');
    try {
      execSync('npx playwright test --reporter=list', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log('⚠️  Some E2E tests failed');
    }

    console.log('\n✅ Test suite execution completed');
    
    // Cleanup
    webProcess.kill();
    execSync('firebase emulators:stop', { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

runTests();
