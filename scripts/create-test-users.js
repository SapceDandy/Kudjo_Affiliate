const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const auth = admin.auth();

async function createTestUsers() {
  console.log('🔐 Creating Firebase Auth test users...');
  
  try {
    // Read our seed data to get user info
    const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../seed/users.json'), 'utf8'));
    const businessesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../seed/businesses.json'), 'utf8'));
    const influencersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../seed/influencers.json'), 'utf8'));
    
    let created = 0;
    const testPassword = 'TestPass123!';
    
    // Create a few test users for each role
    const testUsers = [
      // Admin users
      { email: 'admin1@getkudjo.com', role: 'admin', uid: 'usr_admin_e01a17c5-3cc2-463f-80c0-0a8acef1faed' },
      
      // Business users (use first 3 businesses)
      ...businessesData.slice(0, 3).map(biz => ({
        email: biz.contactEmail,
        role: 'business',
        uid: biz.id,
        displayName: biz.name
      })),
      
      // Influencer users (use first 3 influencers)  
      ...influencersData.slice(0, 3).map(inf => ({
        email: inf.email,
        role: 'influencer', 
        uid: inf.id,
        displayName: inf.name
      }))
    ];
    
    for (const user of testUsers) {
      try {
        // Check if user already exists
        try {
          await auth.getUser(user.uid);
          console.log(`✅ User ${user.email} already exists`);
          continue;
        } catch (e) {
          // User doesn't exist, create it
        }
        
        await auth.createUser({
          uid: user.uid,
          email: user.email,
          password: testPassword,
          displayName: user.displayName || user.email.split('@')[0],
          emailVerified: true
        });
        
        console.log(`✅ Created ${user.role} user: ${user.email}`);
        created++;
        
      } catch (error) {
        console.error(`❌ Failed to create user ${user.email}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Created ${created} new Firebase Auth users!`);
    console.log('\n📋 Test Login Credentials:');
    console.log('Password for all users: TestPass123!');
    console.log('\nAdmin:');
    console.log('  admin1@getkudjo.com');
    console.log('\nBusiness Users:');
    testUsers.filter(u => u.role === 'business').forEach(u => console.log(`  ${u.email}`));
    console.log('\nInfluencer Users:');
    testUsers.filter(u => u.role === 'influencer').forEach(u => console.log(`  ${u.email}`));
    
  } catch (error) {
    console.error('💥 Error creating test users:', error);
  }
}

createTestUsers().then(() => {
  console.log('\n✅ Test user creation completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
