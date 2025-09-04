const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Utility functions
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function generatePastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function generateFutureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

// Data generators
const cuisines = ['Italian', 'Mexican', 'American', 'Asian', 'Mediterranean', 'BBQ', 'Cafe', 'Seafood', 'Steakhouse', 'Vegan'];
const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const platforms = ['instagram', 'tiktok', 'youtube', 'twitter'];
const cities = [
  { name: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
  { name: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  { name: 'San Diego, CA', lat: 32.7157, lng: -117.1611 },
  { name: 'Portland, OR', lat: 45.5152, lng: -122.6784 },
  { name: 'Nashville, TN', lat: 36.1627, lng: -86.7816 }
];

const businessNames = [
  'Mario\'s Italian Bistro', 'Taco Fiesta', 'The Burger Joint', 'Sushi Master', 'Coffee Corner',
  'Pizza Palace', 'BBQ Smokehouse', 'Green Garden Cafe', 'Ocean View Seafood', 'Prime Steakhouse',
  'Noodle House', 'Breakfast Club', 'Sandwich Shop', 'Ice Cream Parlor', 'Wine & Dine',
  'Street Tacos', 'Pasta Paradise', 'Grill & Chill', 'Fresh Salads', 'Donut Delight',
  'Curry House', 'Smoothie Bar', 'Bakery Bliss', 'Ramen Station', 'Chicken Coop',
  'Veggie Delights', 'Craft Brewery', 'Juice Junction', 'Waffle Works', 'Soup Kitchen'
];

const influencerNames = [
  'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Kim', 'Lisa Thompson',
  'Alex Martinez', 'Jessica Wong', 'Ryan O\'Connor', 'Amanda Davis', 'Carlos Ruiz',
  'Nicole Brown', 'Kevin Lee', 'Rachel Green', 'Tyler Wilson', 'Megan Clark',
  'Jordan Taylor', 'Ashley Garcia', 'Brandon Miller', 'Samantha Jones', 'Chris Anderson'
];

const handles = [
  'foodie_explorer', 'taste_tester', 'chef_wannabe', 'hungry_blogger', 'snack_attack',
  'flavor_hunter', 'meal_master', 'food_critic', 'dining_diva', 'culinary_queen',
  'bite_sized', 'food_fanatic', 'taste_buds', 'kitchen_king', 'food_lover',
  'gourmet_guru', 'recipe_rebel', 'food_fighter', 'taste_maker', 'dish_destroyer'
];

function generateUsers() {
  const users = [];
  
  // 10 admins
  for (let i = 0; i < 10; i++) {
    users.push({
      id: `usr_admin_${uuidv4()}`,
      email: `admin${i + 1}@getkudjo.com`,
      role: 'admin',
      status: 'active',
      createdAt: generatePastDate(randomInt(1, 365))
    });
  }
  
  // 30 business owners
  for (let i = 0; i < 30; i++) {
    users.push({
      id: `usr_biz_${uuidv4()}`,
      email: `business${i + 1}@${businessNames[i] || 'restaurant'}.com`.toLowerCase().replace(/[^a-z0-9@.]/g, ''),
      role: 'business_owner',
      status: 'active',
      createdAt: generatePastDate(randomInt(1, 180))
    });
  }
  
  // 60 influencers
  for (let i = 0; i < 60; i++) {
    users.push({
      id: `usr_inf_${uuidv4()}`,
      email: `${handles[i % handles.length]}${i}@influencer.com`,
      role: 'influencer',
      status: 'active',
      createdAt: generatePastDate(randomInt(1, 90))
    });
  }
  
  return users;
}

function generateBusinesses(users) {
  const businesses = [];
  const businessOwners = users.filter(u => u.role === 'business_owner');
  
  for (let i = 0; i < 30; i++) {
    const city = randomChoice(cities);
    const cuisine = randomChoice(cuisines);
    const businessId = `biz_${uuidv4()}`;
    
    businesses.push({
      id: businessId,
      ownerUserId: businessOwners[i].id,
      name: businessNames[i] || `${cuisine} Restaurant ${i + 1}`,
      address: `${randomInt(100, 9999)} ${randomChoice(['Main St', 'Oak Ave', 'Pine St', 'Elm Dr', 'Market St'])}, ${city.name}`,
      cuisine,
      avgTicket: randomInt(15, 75),
      defaultSplitPct: randomInt(10, 25),
      geo: {
        lat: city.lat + randomFloat(-0.1, 0.1),
        lng: city.lng + randomFloat(-0.1, 0.1)
      },
      hours: {
        mon: { open: '09:00', close: '21:00' },
        tue: { open: '09:00', close: '21:00' },
        wed: { open: '09:00', close: '21:00' },
        thu: { open: '09:00', close: '21:00' },
        fri: { open: '09:00', close: '22:00' },
        sat: { open: '10:00', close: '22:00' },
        sun: { open: '10:00', close: '20:00' }
      },
      status: 'active',
      createdAt: generatePastDate(randomInt(1, 120))
    });
  }
  
  return businesses;
}

function generateInfluencers(users) {
  const influencers = [];
  const influencerUsers = users.filter(u => u.role === 'influencer');
  
  for (let i = 0; i < 60; i++) {
    const followers = randomInt(1000, 100000);
    const tier = followers < 5000 ? 'Bronze' : 
                 followers < 20000 ? 'Silver' : 
                 followers < 50000 ? 'Gold' : 'Platinum';
    
    const city = randomChoice(cities);
    
    influencers.push({
      id: `inf_${uuidv4()}`,
      ownerUserId: influencerUsers[i].id,
      name: influencerNames[i % influencerNames.length] || `Influencer ${i + 1}`,
      handle: `@${handles[i % handles.length]}${i}`,
      followers,
      avgViews: Math.floor(followers * randomFloat(0.3, 0.8)),
      platforms: randomChoice([
        ['instagram'],
        ['tiktok'],
        ['youtube'],
        ['instagram', 'tiktok'],
        ['instagram', 'youtube'],
        ['tiktok', 'youtube'],
        ['instagram', 'tiktok', 'youtube']
      ]),
      tier,
      geo: {
        lat: city.lat + randomFloat(-0.2, 0.2),
        lng: city.lng + randomFloat(-0.2, 0.2)
      },
      status: 'active',
      createdAt: generatePastDate(randomInt(1, 60))
    });
  }
  
  return influencers;
}

function generateOffers(businesses) {
  const offers = [];
  const offerTitles = [
    '20% Off Dinner', 'Buy One Get One Free', 'Happy Hour Special', 'Weekend Brunch Deal',
    'Student Discount', 'First Time Customer', 'Lunch Special', 'Date Night Package',
    'Family Meal Deal', 'Early Bird Special', 'Late Night Bites', 'Seasonal Special'
  ];
  
  // Each business gets 6-8 offers
  businesses.forEach(business => {
    const numOffers = randomInt(6, 8);
    
    for (let i = 0; i < numOffers; i++) {
      const discountPercent = randomInt(10, 50);
      const offerId = `off_${uuidv4()}`;
      
      offers.push({
        id: offerId,
        businessId: business.id,
        title: `${offerTitles[i % offerTitles.length]} - ${business.name}`,
        description: `Enjoy ${discountPercent}% off at ${business.name}. Limited time offer!`,
        discountPercent,
        splitPct: business.defaultSplitPct,
        status: randomChoice(['active', 'active', 'active', 'paused']), // 75% active
        startDate: generatePastDate(randomInt(1, 30)),
        endDate: generateFutureDate(randomInt(30, 90)),
        maxRedemptions: randomInt(50, 500),
        createdAt: generatePastDate(randomInt(1, 30))
      });
    }
  });
  
  return offers;
}

function generateOfferAssignments(offers, influencers) {
  const assignments = [];
  const coupons = [];
  const affiliateLinks = [];
  
  // Each offer gets 2-3 influencer assignments
  offers.forEach(offer => {
    const numAssignments = randomInt(2, 3);
    const selectedInfluencers = [];
    
    // Randomly select influencers for this offer
    while (selectedInfluencers.length < numAssignments) {
      const influencer = randomChoice(influencers);
      if (!selectedInfluencers.find(inf => inf.id === influencer.id)) {
        selectedInfluencers.push(influencer);
      }
    }
    
    selectedInfluencers.forEach(influencer => {
      const assignmentId = `asg_${uuidv4()}`;
      const couponId = `coup_${uuidv4()}`;
      const linkId = `link_${uuidv4().slice(0, 8)}`;
      
      // Create assignment
      assignments.push({
        id: assignmentId,
        offerId: offer.id,
        businessId: offer.businessId,
        influencerId: influencer.id,
        terms: {
          discountPercent: offer.discountPercent,
          splitPercent: offer.splitPct
        },
        status: offer.status === 'active' ? 'active' : 'paused',
        tracking: {
          couponId,
          affiliateLinkId: linkId
        },
        createdAt: generatePastDate(randomInt(1, 25)),
        updatedAt: generatePastDate(randomInt(0, 5))
      });
      
      // Create coupon
      const couponCode = `${offer.businessId.slice(-3).toUpperCase()}${influencer.handle.slice(1, 4).toUpperCase()}${randomInt(10, 99)}`;
      coupons.push({
        id: couponId,
        assignmentId,
        code: couponCode,
        status: 'active',
        usageCount: randomInt(0, 20),
        expiresAt: offer.endDate,
        createdAt: generatePastDate(randomInt(1, 25))
      });
      
      // Create affiliate link
      affiliateLinks.push({
        id: linkId,
        assignmentId,
        url: `https://kudjo.app/r/${linkId}`,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://kudjo.app/r/${linkId}`,
        status: 'active',
        createdAt: generatePastDate(randomInt(1, 25))
      });
    });
  });
  
  return { assignments, coupons, affiliateLinks };
}

function generateRedemptions(assignments, businesses, influencers, offers) {
  const redemptions = [];
  
  // Generate 2000+ redemptions spread across 60 days
  assignments.forEach(assignment => {
    const numRedemptions = randomInt(3, 12); // Each assignment gets 3-12 redemptions
    
    const business = businesses.find(b => b.id === assignment.businessId);
    const influencer = influencers.find(i => i.id === assignment.influencerId);
    const offer = offers.find(o => o.id === assignment.offerId);
    
    for (let i = 0; i < numRedemptions; i++) {
      const amount = randomFloat(business.avgTicket * 0.5, business.avgTicket * 1.5);
      const discountAmount = amount * (assignment.terms.discountPercent / 100);
      const influencerEarnings = amount * (assignment.terms.splitPercent / 100);
      
      redemptions.push({
        id: `red_${uuidv4()}`,
        assignmentId: assignment.id,
        businessId: assignment.businessId,
        influencerId: assignment.influencerId,
        offerId: assignment.offerId,
        couponId: assignment.tracking.couponId,
        amount: Math.round(amount * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        influencerEarnings: Math.round(influencerEarnings * 100) / 100,
        createdAt: generatePastDate(randomInt(1, 60)),
        redeemedAt: generatePastDate(randomInt(1, 60)),
        status: 'complete'
      });
    }
  });
  
  return redemptions;
}

function generateBusinessMetrics(businesses, redemptions) {
  const metrics = [];
  
  businesses.forEach(business => {
    const businessRedemptions = redemptions.filter(r => r.businessId === business.id);
    const totalRevenue = businessRedemptions.reduce((sum, r) => sum + r.amount, 0);
    const totalPayouts = businessRedemptions.reduce((sum, r) => sum + r.influencerEarnings, 0);
    
    metrics.push({
      businessId: business.id,
      date: new Date().toISOString().slice(0, 10),
      activeOffers: randomInt(3, 8),
      couponUsage: businessRedemptions.length,
      revenueCents: Math.round(totalRevenue * 100),
      payoutsCents: Math.round(totalPayouts * 100),
      lastUpdated: new Date().toISOString()
    });
  });
  
  return metrics;
}

function generateCampaignLogs(assignments, offers, redemptions) {
  const logs = [];
  
  // Offer creation logs
  offers.forEach(offer => {
    logs.push({
      id: `log_${uuidv4()}`,
      action: 'offer_created',
      performedBy: 'system', // Would be business owner in real scenario
      targetId: offer.id,
      performedAt: offer.createdAt
    });
  });
  
  // Assignment creation logs
  assignments.forEach(assignment => {
    logs.push({
      id: `log_${uuidv4()}`,
      action: 'assignment_created',
      performedBy: 'system',
      targetId: assignment.id,
      performedAt: assignment.createdAt
    });
  });
  
  // Sample redemption logs (every 10th redemption)
  redemptions.filter((_, index) => index % 10 === 0).forEach(redemption => {
    logs.push({
      id: `log_${uuidv4()}`,
      action: 'redemption_processed',
      performedBy: 'system',
      targetId: redemption.id,
      performedAt: redemption.redeemedAt
    });
  });
  
  return logs;
}

// Main generation function
async function generateLargeSeedData() {
  console.log('🚀 Generating large-scale seed data...');
  
  const users = generateUsers();
  console.log(`✅ Generated ${users.length} users`);
  
  const businesses = generateBusinesses(users);
  console.log(`✅ Generated ${businesses.length} businesses`);
  
  const influencers = generateInfluencers(users);
  console.log(`✅ Generated ${influencers.length} influencers`);
  
  const offers = generateOffers(businesses);
  console.log(`✅ Generated ${offers.length} offers`);
  
  const { assignments, coupons, affiliateLinks } = generateOfferAssignments(offers, influencers);
  console.log(`✅ Generated ${assignments.length} assignments, ${coupons.length} coupons, ${affiliateLinks.length} affiliate links`);
  
  const redemptions = generateRedemptions(assignments, businesses, influencers, offers);
  console.log(`✅ Generated ${redemptions.length} redemptions`);
  
  const businessMetrics = generateBusinessMetrics(businesses, redemptions);
  console.log(`✅ Generated ${businessMetrics.length} business metrics`);
  
  const campaignLogs = generateCampaignLogs(assignments, offers, redemptions);
  console.log(`✅ Generated ${campaignLogs.length} campaign logs`);
  
  // Create seed directory
  const seedDir = path.join(__dirname, '..', 'seed');
  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir);
  }
  
  // Write all data to JSON files
  const collections = {
    users,
    businesses,
    influencers,
    offers,
    offer_assignments: assignments,
    coupons,
    affiliateLinks,
    redemptions,
    businessMetrics,
    campaignLogs
  };
  
  for (const [collectionName, data] of Object.entries(collections)) {
    const filePath = path.join(seedDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`📄 Wrote ${data.length} records to ${collectionName}.json`);
  }
  
  console.log('🎉 Large-scale seed data generation complete!');
  console.log(`📊 Summary:
    - ${users.length} users (10 admins, 30 business owners, 60 influencers)
    - ${businesses.length} businesses
    - ${offers.length} offers
    - ${assignments.length} offer assignments
    - ${coupons.length} coupons
    - ${affiliateLinks.length} affiliate links
    - ${redemptions.length} redemptions
    - ${businessMetrics.length} business metrics
    - ${campaignLogs.length} campaign logs`);
}

// Run if called directly
if (require.main === module) {
  generateLargeSeedData().catch(console.error);
}

module.exports = { generateLargeSeedData };
