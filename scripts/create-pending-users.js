const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function createPendingUsers() {
  console.log('Creating pending users for approval testing...');

  // Create pending businesses
  const pendingBusinesses = [
    {
      id: 'biz_pending_1',
      businessName: 'Fresh Eats Cafe',
      email: 'owner@fresheats.com',
      phone: '+1-555-0123',
      website: 'https://fresheats.com',
      category: 'Food & Beverage',
      description: 'Local organic cafe specializing in fresh, healthy meals and artisanal coffee.',
      approvalStatus: 'pending',
      approved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102'
      }
    },
    {
      id: 'biz_pending_2', 
      businessName: 'TechStyle Boutique',
      email: 'hello@techstyle.com',
      phone: '+1-555-0456',
      website: 'https://techstyle.com',
      category: 'Fashion & Retail',
      description: 'Modern fashion boutique featuring tech-inspired clothing and accessories.',
      approvalStatus: 'pending',
      approved: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      address: {
        street: '456 Fashion Ave',
        city: 'Los Angeles', 
        state: 'CA',
        zipCode: '90210'
      }
    }
  ];

  // Create pending influencers
  const pendingInfluencers = [
    {
      id: 'inf_pending_1',
      name: 'Sarah Johnson',
      email: 'sarah@foodiegram.com',
      phone: '+1-555-0789',
      tier: 'M',
      followers: 45000,
      category: 'Food & Lifestyle',
      description: 'Food blogger and lifestyle influencer sharing healthy recipes and restaurant reviews.',
      approvalStatus: 'pending',
      approved: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      socialMedia: {
        instagram: '@sarahfoodie',
        tiktok: '@sarahcooks',
        youtube: 'Sarah\'s Kitchen'
      }
    },
    {
      id: 'inf_pending_2',
      name: 'Mike Chen',
      email: 'mike@techreviews.com', 
      phone: '+1-555-0321',
      tier: 'L',
      followers: 125000,
      category: 'Technology',
      description: 'Tech reviewer and gadget enthusiast creating content about the latest innovations.',
      approvalStatus: 'pending',
      approved: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      socialMedia: {
        instagram: '@miketech',
        tiktok: '@techreviews',
        youtube: 'Mike Chen Tech'
      }
    },
    {
      id: 'inf_pending_3',
      name: 'Emma Rodriguez',
      email: 'emma@fitlifestyle.com',
      phone: '+1-555-0654',
      tier: 'S',
      followers: 15000,
      category: 'Fitness & Wellness',
      description: 'Fitness coach and wellness advocate promoting healthy living and workout routines.',
      approvalStatus: 'pending',
      approved: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      socialMedia: {
        instagram: '@emmafit',
        tiktok: '@fitwithem'
      }
    }
  ];

  try {
    // Add businesses
    for (const business of pendingBusinesses) {
      await db.collection('businesses').doc(business.id).set(business);
      console.log(`✅ Created pending business: ${business.businessName}`);
    }

    // Add influencers  
    for (const influencer of pendingInfluencers) {
      await db.collection('influencers').doc(influencer.id).set(influencer);
      console.log(`✅ Created pending influencer: ${influencer.name}`);
    }

    console.log('\n🎉 Successfully created test pending users!');
    console.log(`📊 Summary:`);
    console.log(`   - ${pendingBusinesses.length} pending businesses`);
    console.log(`   - ${pendingInfluencers.length} pending influencers`);
    console.log(`   - Total: ${pendingBusinesses.length + pendingInfluencers.length} pending approvals`);
    
  } catch (error) {
    console.error('❌ Error creating pending users:', error);
  }
}

// Run the script
createPendingUsers()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
