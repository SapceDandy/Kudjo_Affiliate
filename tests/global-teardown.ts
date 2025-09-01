import { execSync } from 'child_process';

async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Stop Firebase emulators
    execSync('firebase emulators:stop', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
  } catch (error) {
    console.log('Emulators already stopped or not running');
  }

  console.log('✅ Test environment cleaned up');
}

export default globalTeardown;
