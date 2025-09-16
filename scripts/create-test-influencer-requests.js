const admin = require('firebase-admin');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'kudjo-affiliate'
  });
}

const db = admin.firestore();

async function createTestInfluencerRequests() {
  console.log('Creating test influencer requests...');

  const testRequests = [
    {
      id: 'req_1',
      infId: 'inf_1', // foodie_explorer
      bizId: 'biz_1', // Mario's Italian Bistro
      businessName: "Mario's Italian Bistro",
      title: 'Italian Food Partnership',
      description: 'We would love to partner with you to promote our authentic Italian cuisine. Perfect for food content creators!',
      proposedSplitPct: 25,
      userDiscountPct: 20,
      userDiscountCents: null,
      minSpendCents: 2500, // $25 minimum
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    {
      id: 'req_2', 
      infId: 'inf_1', // foodie_explorer
      bizId: 'biz_4', // Sushi Master
      businessName: 'Sushi Master',
      title: 'Sushi Content Collaboration',
      description: 'Join us for an exclusive sushi experience! Create content featuring our premium sushi selection.',
      proposedSplitPct: 30,
      userDiscountPct: 15,
      userDiscountCents: null,
      minSpendCents: 3000, // $30 minimum
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    {
      id: 'req_3',
      infId: 'inf_2', // taste_tester_mike  
      bizId: 'biz_2', // Taco Express
      businessName: 'Taco Express',
      title: 'Mexican Food Review Partnership',
      description: 'We are looking for authentic food reviewers to showcase our traditional Mexican dishes.',
      proposedSplitPct: 20,
      userDiscountPct: null,
      userDiscountCents: 500, // $5 off
      minSpendCents: 1500, // $15 minimum
      status: 'countered',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      businessResponse: 'We can offer 22% commission instead of 20%'
    },
    {
      id: 'req_4',
      infId: 'inf_2', // taste_tester_mike
      bizId: 'biz_5', // Coffee Corner
      businessName: 'Coffee Corner',
      title: 'Coffee & Breakfast Content',
      description: 'Partner with us to create morning content featuring our specialty coffee and breakfast items.',
      proposedSplitPct: 18,
      userDiscountPct: 25,
      userDiscountCents: null,
      minSpendCents: 1000, // $10 minimum
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }
  ];

  const batch = db.batch();

  for (const request of testRequests) {
    const docRef = db.collection('influencerRequests').doc(request.id);
    batch.set(docRef, request);
  }

  try {
    await batch.commit();
    console.log('✅ Successfully created test influencer requests:');
    testRequests.forEach(req => {
      console.log(`  - ${req.title} (${req.businessName} → inf_${req.infId.split('_')[1]}) - Status: ${req.status}`);
    });
  } catch (error) {
    console.error('❌ Error creating test requests:', error);
  }
}

async function main() {
  try {
    await createTestInfluencerRequests();
    console.log('\n🎉 Test influencer requests created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
