const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Use default credentials or environment variables
  admin.initializeApp({
    projectId: 'kudjo-affiliate'
  });
}

const db = admin.firestore();

async function createMockProgram() {
  try {
    // Get the first business ID from businesses collection
    const businessesSnapshot = await db.collection('businesses').limit(1).get();
    if (businessesSnapshot.empty) {
      console.log('No businesses found. Please create a business first.');
      return;
    }
    
    const businessDoc = businessesSnapshot.docs[0];
    const businessId = businessDoc.id;
    const businessData = businessDoc.data();
    
    console.log('Creating mock program for business:', businessData.name || businessId);
    
    // Create mock active program
    const mockProgram = {
      businessId: businessId,
      businessName: businessData.name || 'Test Business',
      influencerId: 'mock_influencer_001',
      influencerName: 'Sarah Martinez',
      influencerHandle: '@sarahmartinez',
      offerTitle: 'Weekend Brunch Special',
      offerId: 'mock_offer_001',
      status: 'active',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      redemptions: 12,
      payoutCents: 18000, // $180.00
      commissionRate: 25, // 25%
      totalRevenue: 72000, // $720.00
      lastActivity: new Date(),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };
    
    // Add to activePrograms collection
    const programRef = await db.collection('activePrograms').add(mockProgram);
    console.log('Created mock program with ID:', programRef.id);
    
    // Also create some mock redemptions for this program
    const mockRedemptions = [
      {
        businessId: businessId,
        influencerId: 'mock_influencer_001',
        programId: programRef.id,
        amount: 2500, // $25.00
        influencerEarnings: 625, // $6.25 (25%)
        couponCode: 'SARAH25',
        redeemedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        businessId: businessId,
        influencerId: 'mock_influencer_001',
        programId: programRef.id,
        amount: 3200, // $32.00
        influencerEarnings: 800, // $8.00 (25%)
        couponCode: 'SARAH25',
        redeemedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        businessId: businessId,
        influencerId: 'mock_influencer_001',
        programId: programRef.id,
        amount: 4800, // $48.00
        influencerEarnings: 1200, // $12.00 (25%)
        couponCode: 'SARAH25',
        redeemedAt: new Date(),
        status: 'completed'
      }
    ];
    
    for (const redemption of mockRedemptions) {
      await db.collection('redemptions').add(redemption);
    }
    
    console.log('Created', mockRedemptions.length, 'mock redemptions');
    console.log('Mock active program setup complete!');
    
  } catch (error) {
    console.error('Error creating mock program:', error);
  }
}

createMockProgram().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
