const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'kudjo-affiliate'
  });
}

const db = admin.firestore();

async function addTierSplitOffers() {
  console.log('Adding offers with tier-based splits...');

  const offersWithTierSplits = [
    {
      id: 'tier_test_1',
      bizId: 'biz_4aaf27ed-decf-4547-b505-3ab750b6f08f', // Mario's Italian Bistro
      title: 'Tier-Based Pizza Special - Mario\'s',
      description: 'Different splits based on your influencer tier!',
      discountType: 'percentage',
      userDiscountPct: 25,
      minSpendCents: 2000, // $20 minimum
      status: 'active',
      active: true,
      startAt: new Date(),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      maxInfluencers: 50,
      maxRedemptions: 200,
      // Tier-based splits
      tierSplits: {
        Small: 8,   // 8% for Small tier
        Medium: 12, // 12% for Medium tier  
        Large: 16,  // 16% for Large tier
        XL: 20,     // 20% for XL tier
        Huge: 25    // 25% for Huge tier
      },
      // Fallback split for backwards compatibility
      splitPct: 12,
      eligibility: {
        tiers: ['S', 'M', 'L', 'XL', 'H']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tier_test_2', 
      bizId: 'biz_81bd7d45-f1c2-4c07-b253-47cc8f201f9c', // Taco Fiesta
      title: 'Tier-Based Taco Tuesday - Taco Fiesta',
      description: 'Higher tier influencers get better splits!',
      discountType: 'percentage',
      userDiscountPct: 30,
      minSpendCents: 1500, // $15 minimum
      status: 'active',
      active: true,
      startAt: new Date(),
      endAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      maxInfluencers: 75,
      maxRedemptions: 300,
      // Tier-based splits
      tierSplits: {
        Small: 5,   // 5% for Small tier
        Medium: 10, // 10% for Medium tier
        Large: 15,  // 15% for Large tier  
        XL: 22,     // 22% for XL tier
        Huge: 30    // 30% for Huge tier
      },
      // Fallback split for backwards compatibility
      splitPct: 15,
      eligibility: {
        tiers: ['S', 'M', 'L', 'XL', 'H']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tier_test_3',
      bizId: 'biz_c45e340c-a26e-4fe9-9ebb-4685bbf54ddb', // The Burger Joint
      title: 'Premium Burger Deal - The Burger Joint',
      description: 'Exclusive tier-based commission structure',
      discountType: 'percentage', 
      userDiscountPct: 20,
      minSpendCents: 2500, // $25 minimum
      status: 'active',
      active: true,
      startAt: new Date(),
      endAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      maxInfluencers: 30,
      maxRedemptions: 150,
      // Tier-based splits
      tierSplits: {
        Small: 6,   // 6% for Small tier
        Medium: 9,  // 9% for Medium tier
        Large: 14,  // 14% for Large tier
        XL: 18,     // 18% for XL tier
        Huge: 24    // 24% for Huge tier
      },
      // Fallback split for backwards compatibility
      splitPct: 14,
      eligibility: {
        tiers: ['S', 'M', 'L', 'XL', 'H']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  try {
    const batch = db.batch();
    
    for (const offer of offersWithTierSplits) {
      const offerRef = db.collection('offers').doc(offer.id);
      batch.set(offerRef, offer);
      console.log(`Added offer: ${offer.title}`);
    }
    
    await batch.commit();
    console.log('✅ Successfully added all tier-based split offers!');
    
    // Log the tier splits for verification
    console.log('\n📊 Tier Split Summary:');
    offersWithTierSplits.forEach(offer => {
      console.log(`\n${offer.title}:`);
      Object.entries(offer.tierSplits).forEach(([tier, split]) => {
        console.log(`  ${tier}: ${split}%`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error adding offers:', error);
  }
}

// Run the script
addTierSplitOffers()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
