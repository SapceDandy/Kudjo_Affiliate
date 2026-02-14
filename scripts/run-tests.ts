#!/usr/bin/env tsx

import { runCanaries } from '../tests/canaries';
import { runSmoke01 } from '../tests/smoke01';
import { runSmoke02 } from '../tests/smoke02';
import { seedBaseEntities } from '../seeds/base';

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  const profile = process.env.SEED_PROFILE || 'base';

  console.log(`🚀 Running tests with profile: ${profile}\n`);

  try {
    // Always seed base entities first
    if (profile === 'base' || profile === 'all') {
      console.log('📦 Seeding base entities...');
      await seedBaseEntities();
      console.log('✅ Base entities seeded\n');
    }

    switch (testType) {
      case 'canaries':
        await runCanaries();
        break;
      
      case 'smoke01':
        await runSmoke01();
        break;
      
      case 'smoke02':
        await runSmoke02();
        break;
      
      case 'smokes':
        console.log('🔥 Running all smoke tests...\n');
        await runSmoke01();
        console.log('');
        await runSmoke02();
        break;
      
      case 'all':
      default:
        console.log('🕊️  Running canaries first...\n');
        await runCanaries();
        console.log('\n🔥 Running smoke tests...\n');
        await runSmoke01();
        console.log('');
        await runSmoke02();
        break;
    }

    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

export { main };
