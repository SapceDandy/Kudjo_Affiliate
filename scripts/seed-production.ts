import admin from 'firebase-admin';

// Define the types locally to avoid import path issues
type UserRole = 'influencer' | 'business' | 'admin';
type PosProvider = 'square' | 'toast' | 'clover' | 'manual';
type PosStatus = 'disconnected' | 'connected' | 'error';
type CouponType = 'AFFILIATE' | 'CONTENT_MEAL';
type CouponStatus = 'issued' | 'active' | 'redeemed' | 'expired';
type RedemptionSource = 'affiliate' | 'content_meal';
type RedemptionStatus = 'pending' | 'payable' | 'paid';

interface UserDoc {
  role: UserRole;
  email: string;
  phone: string;
  name: string;
  handle?: string;
  status: 'active' | 'disabled' | 'pending';
  createdAt: string;
}

interface BusinessDoc {
  ownerUid: string;
  name: string;
  address: string;
  geo?: { lat: number; lng: number };
  hours?: Record<string, { open: string; close: string }[]>;
  cuisine?: string;
  avgTicket?: number;
  posProvider: PosProvider;
  posStatus: PosStatus;
  defaultSplitPct: number;
  rules?: { minSpend?: number; blackout?: string[]; hours?: string[] };
  status: 'active' | 'paused' | 'closed';
}

interface InfluencerDoc {
  ownerUid: string;
  handle: string;
  reachMetrics?: { followers?: number; avgViews?: number };
  geo?: { lat: number; lng: number };
  tiers?: string[];
  status: 'active' | 'paused' | 'banned';
}

interface OfferDoc {
  bizId: string;
  title: string;
  description?: string;
  splitPct: number;
  publicCode: string;
  minSpend?: number;
  blackout?: string[];
  startAt: string;
  endAt?: string;
  status: 'active' | 'paused' | 'ended';
}

interface CouponDoc {
  type: CouponType;
  bizId: string;
  infId: string;
  offerId: string;
  linkId?: string;
  code: string;
  status: CouponStatus;
  cap_cents?: number;
  deadlineAt?: string;
  createdAt: string;
  admin: {
    posAdded: boolean;
    posAddedAt?: string;
    notes?: string;
  };
}

interface CouponStatsDailyDoc {
  couponId: string;
  bizId: string;
  infId: string;
  date: string;
  uses: number;
  revenue_cents: number;
  payouts_cents: number;
}

interface AffiliateLinkDoc {
  bizId: string;
  infId: string;
  offerId: string;
  shortCode: string;
  url: string;
  qrUrl: string;
  status: 'active' | 'paused';
  createdAt: string;
}

interface RedemptionDoc {
  couponId: string;
  linkId?: string;
  bizId: string;
  infId: string;
  offerId: string;
  source: RedemptionSource;
  amount_cents: number;
  discount_cents: number;
  currency: string;
  eventId?: string;
  createdAt: string;
  status: RedemptionStatus;
  holdUntil?: string;
}

// Initialize Firebase Admin if not already done
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'kudjo-affiliate'
  });
}

const db = admin.firestore();

// Realistic business data
const businessTypes = [
  { type: 'Restaurant', cuisines: ['Italian', 'Mexican', 'American', 'Asian', 'French', 'Mediterranean', 'Indian', 'Thai'] },
  { type: 'Cafe', cuisines: ['Coffee', 'Bakery', 'Breakfast', 'Sandwiches'] },
  { type: 'Bar', cuisines: ['Sports Bar', 'Wine Bar', 'Cocktail Lounge', 'Brewery'] },
  { type: 'Fast Food', cuisines: ['Burgers', 'Pizza', 'Tacos', 'Chicken', 'Subs'] },
  { type: 'Retail', cuisines: ['Fashion', 'Electronics', 'Home Goods', 'Beauty'] },
  { type: 'Health', cuisines: ['Fitness', 'Spa', 'Wellness', 'Nutrition'] }
];

const businessNames = [
  // Restaurants
  'The Golden Spoon', 'Bella Vista', 'Sunset Grill', 'Urban Kitchen', 'Coastal Bistro',
  'Fire & Stone', 'Garden Cafe', 'Metro Diner', 'Riverside Tavern', 'The Local Table',
  'Harvest Moon', 'Blue Mountain', 'Copper Kettle', 'Silver Fork', 'Green Valley',
  // Cafes
  'Morning Brew', 'Bean There', 'Steam & Cream', 'Roasted Beans', 'Corner Cafe',
  'Daily Grind', 'Espresso Bar', 'Coffee Culture', 'Brew House', 'Cup & Saucer',
  // Bars
  'The Tap Room', 'Whiskey Row', 'Craft & Draft', 'Happy Hour', 'Night Owl',
  'Barley & Hops', 'The Wine Cellar', 'Cocktail Corner', 'Spirits & More', 'Last Call',
  // Fast Food
  'Quick Bites', 'Fast & Fresh', 'Speed Kitchen', 'Grab & Go', 'Rush Hour',
  'Express Eats', 'Rapid Fire', 'Swift Service', 'Flash Food', 'Instant Meals',
  // Retail
  'Style Central', 'Fashion Forward', 'Trend Setters', 'Modern Look', 'Classic Style',
  'Tech Hub', 'Gadget Store', 'Digital World', 'Innovation Station', 'Future Tech',
  // Health
  'Wellness Center', 'Fit Life', 'Pure Health', 'Vital Body', 'Strong Spirit',
  'Zen Spa', 'Relax Zone', 'Peaceful Mind', 'Harmony Health', 'Balance Point'
];

const cities = [
  { name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { name: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { name: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { name: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
  { name: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { name: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { name: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { name: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 }
];

// Influencer data
const influencerHandles = [
  'foodielover', 'tastebud_adventures', 'culinary_explorer', 'dining_diva', 'flavor_hunter',
  'coffee_connoisseur', 'brunch_queen', 'pizza_prophet', 'taco_tuesday', 'burger_boss',
  'dessert_dreams', 'healthy_eats', 'vegan_vibes', 'keto_kitchen', 'fit_foodie',
  'wine_wisdom', 'cocktail_creator', 'brewery_hopper', 'spirit_seeker', 'mixology_master',
  'fashion_forward', 'style_setter', 'trend_tracker', 'outfit_oracle', 'beauty_guru',
  'makeup_maven', 'skincare_specialist', 'wellness_warrior', 'fitness_fanatic', 'yoga_yogi',
  'tech_reviewer', 'gadget_guru', 'app_advisor', 'digital_nomad', 'startup_scout',
  'travel_tales', 'adventure_awaits', 'city_explorer', 'beach_bum', 'mountain_climber',
  'book_worm', 'movie_buff', 'music_lover', 'art_enthusiast', 'culture_curator',
  'lifestyle_blogger', 'daily_dose', 'real_talk', 'authentic_me', 'living_my_best'
];

const influencerNames = [
  'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Kim', 'Jessica Brown',
  'Alex Thompson', 'Maria Garcia', 'Ryan Martinez', 'Lisa Wang', 'James Wilson',
  'Ashley Davis', 'Kevin Lee', 'Rachel Green', 'Tom Anderson', 'Nicole Taylor',
  'Chris Moore', 'Amanda White', 'Brandon Hall', 'Megan Young', 'Justin Clark',
  'Stephanie Lewis', 'Daniel Walker', 'Lauren Hill', 'Jordan Scott', 'Brittany Adams',
  'Tyler Baker', 'Samantha King', 'Andrew Wright', 'Kayla Turner', 'Zachary Phillips',
  'Hannah Campbell', 'Matthew Parker', 'Victoria Evans', 'Nathan Edwards', 'Alexis Collins',
  'Jacob Stewart', 'Olivia Morris', 'Ethan Rogers', 'Madison Reed', 'Caleb Cook',
  'Chloe Bell', 'Noah Murphy', 'Ava Bailey', 'Liam Rivera', 'Sophia Cooper',
  'Mason Richardson', 'Isabella Cox', 'Logan Ward', 'Grace Peterson', 'Luke Gray'
];

// Utility functions
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateRealisticFollowers(): number {
  const rand = Math.random();
  if (rand < 0.4) return randomInt(1000, 10000); // Micro influencers
  if (rand < 0.7) return randomInt(10000, 100000); // Mid-tier
  if (rand < 0.9) return randomInt(100000, 500000); // Macro
  return randomInt(500000, 2000000); // Mega
}

function getInfluencerTier(followers: number): string[] {
  if (followers < 10000) return ['Bronze'];
  if (followers < 50000) return ['Bronze', 'Silver'];
  if (followers < 200000) return ['Silver', 'Gold'];
  return ['Gold', 'Platinum'];
}

function generateBusinessHours() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours: Record<string, { open: string; close: string }[]> = {};
  
  days.forEach(day => {
    if (day === 'sunday' && Math.random() < 0.3) {
      // 30% chance closed on Sunday
      return;
    }
    
    const openHour = randomInt(6, 11); // 6 AM to 11 AM
    const closeHour = randomInt(18, 23); // 6 PM to 11 PM
    
    hours[day] = [{
      open: `${openHour.toString().padStart(2, '0')}:00`,
      close: `${closeHour.toString().padStart(2, '0')}:00`
    }];
  });
  
  return hours;
}

function generateOfferTitle(cuisine: string): string {
  const templates = [
    `${randomInt(10, 50)}% Off ${cuisine}`,
    `Buy One Get One Free ${cuisine}`,
    `Free Appetizer with ${cuisine} Entree`,
    `$${randomInt(5, 20)} Off Your Order`,
    `Happy Hour Special`,
    `Student Discount`,
    `First Time Customer Deal`,
    `Weekend Special`
  ];
  return randomChoice(templates);
}

async function createBusinesses(): Promise<string[]> {
  console.log('Creating 200 businesses...');
  const businessIds: string[] = [];
  
  for (let i = 0; i < 200; i++) {
    const city = randomChoice(cities);
    const businessType = randomChoice(businessTypes);
    const cuisine = randomChoice(businessType.cuisines);
    
    // Generate realistic business name
    let businessName: string;
    if (i < businessNames.length) {
      businessName = businessNames[i];
    } else {
      businessName = `${randomChoice(['The', 'Urban', 'Classic', 'Modern', 'Local'])} ${randomChoice(['Kitchen', 'Bistro', 'Grill', 'House', 'Corner', 'Point', 'Place'])}`;
    }
    
    // Create owner user
    const ownerUid = `biz_owner_${i + 1}`;
    await db.doc(`users/${ownerUid}`).set({
      role: 'business',
      email: `owner${i + 1}@${businessName.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      name: `${randomChoice(['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa'])} ${randomChoice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'])}`,
      status: 'active',
      createdAt: new Date(Date.now() - randomInt(1, 365) * 24 * 60 * 60 * 1000).toISOString()
    } as UserDoc);
    
    const businessData: BusinessDoc = {
      ownerUid,
      name: businessName,
      address: `${randomInt(100, 9999)} ${randomChoice(['Main', 'First', 'Second', 'Oak', 'Pine', 'Elm', 'Market', 'Center'])} St, ${city.name}, ${city.state}`,
      geo: {
        lat: city.lat + randomFloat(-0.1, 0.1),
        lng: city.lng + randomFloat(-0.1, 0.1)
      },
      hours: generateBusinessHours(),
      cuisine,
      avgTicket: randomInt(15, 150),
      posProvider: randomChoice(['square', 'toast', 'clover', 'manual']),
      posStatus: randomChoice(['connected', 'connected', 'connected', 'disconnected']), // 75% connected
      defaultSplitPct: randomInt(15, 30),
      rules: {
        minSpend: Math.random() < 0.6 ? randomInt(10, 50) : undefined,
        blackout: Math.random() < 0.3 ? ['2024-12-25', '2024-01-01'] : undefined,
        hours: Math.random() < 0.4 ? ['17:00-21:00'] : undefined
      },
      status: randomChoice(['active', 'active', 'active', 'paused']) // 75% active
    };
    
    const docRef = await db.collection('businesses').add(businessData);
    businessIds.push(docRef.id);
    
    if ((i + 1) % 50 === 0) {
      console.log(`Created ${i + 1} businesses...`);
    }
  }
  
  console.log('✅ Created 200 businesses');
  return businessIds;
}

async function createInfluencers(): Promise<string[]> {
  console.log('Creating 200 influencers...');
  const influencerIds: string[] = [];
  
  for (let i = 0; i < 200; i++) {
    const city = randomChoice(cities);
    const followers = generateRealisticFollowers();
    const avgViews = Math.floor(followers * randomFloat(0.05, 0.3)); // 5-30% of followers view content
    
    // Create owner user
    const ownerUid = `inf_owner_${i + 1}`;
    const handle = i < influencerHandles.length 
      ? influencerHandles[i] 
      : `${randomChoice(['food', 'life', 'style', 'travel', 'fun'])}_${randomChoice(['lover', 'enthusiast', 'explorer', 'guru', 'pro'])}${randomInt(10, 99)}`;
    
    const name = i < influencerNames.length 
      ? influencerNames[i] 
      : `${randomChoice(['Alex', 'Jordan', 'Casey', 'Riley', 'Taylor'])} ${randomChoice(['Johnson', 'Smith', 'Davis', 'Wilson', 'Moore'])}`;
    
    await db.doc(`users/${ownerUid}`).set({
      role: 'influencer',
      email: `${handle}@example.com`,
      phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      name,
      handle: `@${handle}`,
      status: 'active',
      createdAt: new Date(Date.now() - randomInt(1, 730) * 24 * 60 * 60 * 1000).toISOString()
    } as UserDoc);
    
    const influencerData: InfluencerDoc = {
      ownerUid,
      handle: `@${handle}`,
      reachMetrics: {
        followers,
        avgViews
      },
      geo: {
        lat: city.lat + randomFloat(-0.05, 0.05),
        lng: city.lng + randomFloat(-0.05, 0.05)
      },
      tiers: getInfluencerTier(followers),
      status: randomChoice(['active', 'active', 'active', 'paused']) // 75% active
    };
    
    const docRef = await db.collection('influencers').add(influencerData);
    influencerIds.push(docRef.id);
    
    if ((i + 1) % 50 === 0) {
      console.log(`Created ${i + 1} influencers...`);
    }
  }
  
  console.log('✅ Created 200 influencers');
  return influencerIds;
}

async function createOffers(businessIds: string[]): Promise<string[]> {
  console.log('Creating offers for businesses...');
  const offerIds: string[] = [];
  
  for (const bizId of businessIds) {
    const numOffers = randomInt(1, 4); // 1-4 offers per business
    
    for (let j = 0; j < numOffers; j++) {
      // Get business data for context
      const bizDoc = await db.doc(`businesses/${bizId}`).get();
      const bizData = bizDoc.data() as BusinessDoc;
      
      const offerData: OfferDoc = {
        bizId,
        title: generateOfferTitle(bizData.cuisine || 'Food'),
        description: `Great deal on ${bizData.cuisine || 'delicious food'} at ${bizData.name}`,
        splitPct: randomInt(15, 35),
        publicCode: `${bizData.name.replace(/\s+/g, '').toUpperCase().slice(0, 6)}${randomInt(10, 99)}`,
        minSpend: Math.random() < 0.6 ? randomInt(20, 100) : undefined,
        blackout: Math.random() < 0.2 ? ['2024-12-25'] : undefined,
        startAt: new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000).toISOString(),
        endAt: Math.random() < 0.7 ? new Date(Date.now() + randomInt(30, 365) * 24 * 60 * 60 * 1000).toISOString() : undefined,
        status: randomChoice(['active', 'active', 'active', 'paused']) // 75% active
      };
      
      const docRef = await db.collection('offers').add(offerData);
      offerIds.push(docRef.id);
    }
  }
  
  console.log(`✅ Created ${offerIds.length} offers`);
  return offerIds;
}

async function createCouponsAndActivity(businessIds: string[], influencerIds: string[], offerIds: string[]): Promise<void> {
  console.log('Creating coupons and activity data...');
  
  // Create 500-800 coupons with realistic distribution
  const numCoupons = randomInt(500, 800);
  
  for (let i = 0; i < numCoupons; i++) {
    const bizId = randomChoice(businessIds);
    const infId = randomChoice(influencerIds);
    
    // Get offers for this business
    const offersQuery = await db.collection('offers').where('bizId', '==', bizId).where('status', '==', 'active').get();
    if (offersQuery.empty) continue;
    
    const offers = offersQuery.docs;
    const offer = randomChoice(offers);
    const offerId = offer.id;
    
    const couponType: 'AFFILIATE' | 'CONTENT_MEAL' = randomChoice(['AFFILIATE', 'CONTENT_MEAL']);
    const createdAt = new Date(Date.now() - randomInt(1, 60) * 24 * 60 * 60 * 1000);
    let shortCode: string | undefined;
    
    // Generate coupon code
    const bizDoc = await db.doc(`businesses/${bizId}`).get();
    const infDoc = await db.doc(`influencers/${infId}`).get();
    const bizData = bizDoc.data() as BusinessDoc;
    const infData = infDoc.data() as InfluencerDoc;
    
    const bizShort = bizData.name.replace(/\s+/g, '').slice(0, 3).toUpperCase();
    const infShort = infData.handle.replace('@', '').slice(0, 3).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const couponData: CouponDoc = {
      type: couponType,
      bizId,
      infId,
      offerId,
      code: `${couponType.slice(0, 3)}-${bizShort}-${infShort}-${randomSuffix}`,
      status: randomChoice(['active', 'active', 'redeemed', 'expired']),
      cap_cents: couponType === 'CONTENT_MEAL' ? randomInt(2000, 10000) : undefined, // $20-100 cap
      deadlineAt: couponType === 'CONTENT_MEAL' 
        ? new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() 
        : undefined,
      createdAt: createdAt.toISOString(),
      admin: {
        posAdded: Math.random() < 0.7, // 70% added to POS
        posAddedAt: Math.random() < 0.7 
          ? new Date(createdAt.getTime() + randomInt(1, 3) * 60 * 60 * 1000).toISOString() 
          : undefined,
        notes: Math.random() < 0.2 ? 'Special promotion for high-value influencer' : undefined
      }
    };
    
    const couponRef = await db.collection('coupons').add(couponData);
    
    // Create affiliate link for AFFILIATE type coupons
    if (couponType === 'AFFILIATE') {
      shortCode = Math.random().toString(36).substring(2, 8);
      const linkData: AffiliateLinkDoc = {
        bizId,
        infId,
        offerId,
        shortCode,
        url: `https://kudjo.app/r/${shortCode}`,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://kudjo.app/r/${shortCode}`,
        status: 'active',
        createdAt: createdAt.toISOString()
      };
      
      await db.collection('affiliateLinks').add(linkData);
      
      // Update coupon with linkId
      await couponRef.update({ linkId: shortCode });
    }
    
    // Generate realistic activity for some coupons
    if (couponData.status === 'redeemed' || Math.random() < 0.4) {
      const daysActive = Math.min(30, Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000)));
      
      for (let day = 0; day < daysActive; day++) {
        if (Math.random() < 0.15) { // 15% chance of activity each day
          const activityDate = new Date(createdAt.getTime() + day * 24 * 60 * 60 * 1000);
          const uses = randomInt(1, 5);
          const avgOrderValue = randomInt(2500, 15000); // $25-150
          const revenue = uses * avgOrderValue;
          const payoutPct = randomInt(15, 35) / 100;
          const payouts = Math.floor(revenue * payoutPct);
          
          // Create daily stats
          const statsId = `${couponRef.id}_${activityDate.toISOString().split('T')[0]}`;
          await db.doc(`couponStatsDaily/${statsId}`).set({
            couponId: couponRef.id,
            bizId,
            infId,
            date: activityDate.toISOString().split('T')[0],
            uses,
            revenue_cents: revenue,
            payouts_cents: payouts
          } as CouponStatsDailyDoc);
          
          // Create individual redemptions
          for (let use = 0; use < uses; use++) {
            const redemptionData: RedemptionDoc = {
              couponId: couponRef.id,
              linkId: couponType === 'AFFILIATE' ? shortCode : undefined,
              bizId,
              infId,
              offerId,
              source: couponType === 'AFFILIATE' ? 'affiliate' : 'content_meal',
              amount_cents: avgOrderValue,
              discount_cents: Math.floor(avgOrderValue * randomFloat(0.1, 0.3)), // 10-30% discount
              currency: 'USD',
              eventId: `pos_${randomInt(100000, 999999)}`,
              createdAt: new Date(activityDate.getTime() + use * 60 * 60 * 1000).toISOString(),
              status: randomChoice(['pending', 'payable', 'paid']),
              holdUntil: Math.random() < 0.1 
                ? new Date(activityDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() 
                : undefined
            };
            
            await db.collection('redemptions').add(redemptionData);
          }
        }
      }
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`Created ${i + 1} coupons...`);
    }
  }
  
  console.log(`✅ Created ${numCoupons} coupons with activity data`);
}

async function createAdminUser(): Promise<void> {
  console.log('Creating admin user...');
  
  const adminUid = 'admin_devon_1';
  await db.doc(`users/${adminUid}`).set({
    role: 'admin',
    email: 'devon@getkudjo.com',
    phone: '555-123-4567',
    name: 'Devon Dudley',
    status: 'active',
    createdAt: new Date().toISOString()
  } as UserDoc);
  
  console.log('✅ Created admin user');
}

async function main() {
  try {
    console.log('🚀 Starting production seed script...');
    console.log('This will create realistic data for 200 businesses and 200 influencers');
    
    // Create admin user first
    await createAdminUser();
    
    // Create businesses (this will also create business owner users)
    const businessIds = await createBusinesses();
    
    // Create influencers (this will also create influencer users)
    const influencerIds = await createInfluencers();
    
    // Create offers for businesses
    const offerIds = await createOffers(businessIds);
    
    // Create coupons, affiliate links, and activity data
    await createCouponsAndActivity(businessIds, influencerIds, offerIds);
    
    console.log('\n🎉 Production seed complete!');
    console.log('\nData created:');
    console.log(`- 1 admin user`);
    console.log(`- 200 businesses with owners`);
    console.log(`- 200 influencers with owners`);
    console.log(`- ${offerIds.length} offers`);
    console.log(`- 500-800 coupons with realistic activity`);
    console.log(`- Affiliate links for applicable coupons`);
    console.log(`- Daily stats and redemption records`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed script
main().catch(console.error); 