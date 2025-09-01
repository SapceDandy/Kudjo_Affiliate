/**
 * Mock data fallbacks for when Firestore quota is exceeded
 * Used to keep the app functional during quota limitations
 */

export const mockInfluencers = [
  {
    id: 'mock-inf-1',
    name: 'Sarah Johnson',
    displayName: 'Sarah Johnson',
    email: 'sarah@example.com',
    tier: 'M',
    followers: 45000,
    platform: 'instagram',
    status: 'ACTIVE',
    joinedAt: new Date('2024-01-15'),
    totalEarnings: 2450.50,
    totalRedemptions: 12,
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
    bio: 'Food & lifestyle content creator',
    location: 'San Francisco, CA',
    verified: true
  },
  {
    id: 'mock-inf-2',
    name: 'Mike Chen',
    displayName: 'Mike Chen',
    email: 'mike@example.com',
    tier: 'S',
    followers: 28000,
    platform: 'tiktok',
    status: 'PENDING',
    joinedAt: new Date('2024-02-01'),
    totalEarnings: 1200.00,
    totalRedemptions: 8,
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Tech reviewer and food enthusiast',
    location: 'Los Angeles, CA',
    verified: false
  },
  {
    id: 'mock-inf-3',
    name: 'Emma Davis',
    displayName: 'Emma Davis',
    email: 'emma@example.com',
    tier: 'S',
    followers: 15000,
    platform: 'instagram',
    status: 'ACTIVE',
    joinedAt: new Date('2024-02-15'),
    totalEarnings: 850.25,
    totalRedemptions: 5,
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Local food blogger',
    location: 'Austin, TX',
    verified: false
  },
  {
    id: 'mock-inf-4',
    name: 'Alex Rodriguez',
    displayName: 'Alex Rodriguez',
    email: 'alex@example.com',
    tier: 'L',
    followers: 125000,
    platform: 'both',
    status: 'ACTIVE',
    joinedAt: new Date('2024-01-20'),
    totalEarnings: 8500.00,
    totalRedemptions: 35,
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    bio: 'Fitness and nutrition expert',
    location: 'Miami, FL',
    verified: true
  },
  {
    id: 'mock-inf-5',
    name: 'Jessica Kim',
    displayName: 'Jessica Kim',
    email: 'jessica@example.com',
    tier: 'XL',
    followers: 350000,
    platform: 'instagram',
    status: 'ACTIVE',
    joinedAt: new Date('2024-01-05'),
    totalEarnings: 15200.75,
    totalRedemptions: 68,
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    bio: 'Travel and food influencer',
    location: 'New York, NY',
    verified: true
  },
  {
    id: 'mock-inf-6',
    name: 'David Thompson',
    displayName: 'David Thompson',
    email: 'david@example.com',
    tier: 'Huge',
    followers: 750000,
    platform: 'both',
    status: 'ACTIVE',
    joinedAt: new Date('2023-12-10'),
    totalEarnings: 32500.00,
    totalRedemptions: 142,
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    bio: 'Celebrity chef and cookbook author',
    location: 'Los Angeles, CA',
    verified: true
  }
];

export const mockBusinesses = [
  {
    id: 'mock-biz-1',
    name: 'Bella Vista Restaurant',
    email: 'owner@bellavista.com',
    type: 'restaurant',
    location: 'San Francisco, CA',
    status: 'ACTIVE',
    joinedAt: new Date('2024-01-01'),
    totalSpent: 5200.00,
    activeCampaigns: 3,
    totalInfluencers: 25,
    averageROAS: 3.2
  },
  {
    id: 'mock-biz-2',
    name: 'Urban Eats',
    email: 'contact@urbaneats.com',
    type: 'fast_casual',
    location: 'Los Angeles, CA',
    status: 'ACTIVE',
    joinedAt: new Date('2024-01-10'),
    totalSpent: 3800.00,
    activeCampaigns: 2,
    totalInfluencers: 18,
    averageROAS: 2.8
  }
];

export const mockOffers = [
  {
    id: 'mock-offer-1',
    businessId: 'mock-biz-1',
    businessName: 'Bella Vista Restaurant',
    title: '30% Off Weekend Brunch',
    description: 'Enjoy our signature weekend brunch menu with 30% off',
    discountType: 'percentage',
    discountValue: 30,
    minOrderValue: 25,
    maxRedemptions: 100,
    currentRedemptions: 23,
    startAt: new Date('2024-01-01'),
    endAt: new Date('2024-12-31'),
    status: 'ACTIVE',
    targetTiers: ['BRONZE', 'SILVER', 'GOLD'],
    category: 'food',
    location: 'San Francisco, CA',
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'mock-offer-2',
    businessId: 'mock-biz-2',
    businessName: 'Urban Eats',
    title: '$10 Off Orders Over $40',
    description: 'Get $10 off your order when you spend $40 or more',
    discountType: 'fixed',
    discountValue: 10,
    minOrderValue: 40,
    maxRedemptions: 50,
    currentRedemptions: 12,
    startAt: new Date('2024-02-01'),
    endAt: new Date('2024-06-30'),
    status: 'ACTIVE',
    targetTiers: ['SILVER', 'GOLD'],
    category: 'food',
    location: 'Los Angeles, CA',
    createdAt: new Date('2024-02-01')
  }
];

export const mockCoupons = [
  {
    id: 'mock-coupon-1',
    code: 'BELLA30-SARAH',
    offerId: 'mock-offer-1',
    influencerId: 'mock-inf-1',
    businessId: 'mock-biz-1',
    type: 'AFFILIATE',
    status: 'ACTIVE',
    createdAt: new Date('2024-02-01'),
    expiresAt: new Date('2024-12-31'),
    qrCode: 'data:image/png;base64,mock-qr-code-data',
    redemptionCount: 3,
    maxRedemptions: 10
  },
  {
    id: 'mock-coupon-2',
    code: 'URBAN10-MIKE',
    offerId: 'mock-offer-2',
    influencerId: 'mock-inf-2',
    businessId: 'mock-biz-2',
    type: 'CONTENT_MEAL',
    status: 'ACTIVE',
    createdAt: new Date('2024-02-15'),
    expiresAt: new Date('2024-06-30'),
    qrCode: 'data:image/png;base64,mock-qr-code-data-2',
    redemptionCount: 1,
    maxRedemptions: 5
  }
];

export const mockRedemptions = [
  {
    id: 'mock-redemption-1',
    couponId: 'mock-coupon-1',
    businessId: 'mock-biz-1',
    influencerId: 'mock-inf-1',
    amount: 45.00,
    commission: 13.50,
    redeemedAt: new Date('2024-02-10'),
    status: 'COMPLETED',
    orderTotal: 45.00,
    discountApplied: 13.50
  },
  {
    id: 'mock-redemption-2',
    couponId: 'mock-coupon-2',
    businessId: 'mock-biz-2',
    influencerId: 'mock-inf-2',
    amount: 50.00,
    commission: 15.00,
    redeemedAt: new Date('2024-02-20'),
    status: 'COMPLETED',
    orderTotal: 50.00,
    discountApplied: 10.00
  }
];

export const mockMetrics = {
  influencer: {
    totalEarnings: 2450.50,
    totalRedemptions: 12,
    activeCoupons: 3,
    pendingPayouts: 450.00,
    conversionRate: 8.5,
    averageOrderValue: 42.50,
    topPerformingOffer: 'Bella Vista Restaurant - 30% Off Weekend Brunch',
    earningsThisMonth: 680.25,
    redemptionsThisMonth: 4
  },
  business: {
    totalSpent: 5200.00,
    totalRedemptions: 35,
    activeCampaigns: 3,
    totalInfluencers: 25,
    averageROAS: 3.2,
    conversionRate: 12.8,
    averageOrderValue: 48.75,
    topPerformingCampaign: '30% Off Weekend Brunch',
    spentThisMonth: 1200.00,
    redemptionsThisMonth: 8
  },
  admin: {
    totalUsers: 1250,
    totalBusinesses: 85,
    totalInfluencers: 420,
    totalRedemptions: 2850,
    totalRevenue: 125000.00,
    averageROAS: 2.9,
    activeOffers: 45,
    pendingReviews: 12,
    monthlyGrowthRate: 15.2,
    topPerformingBusiness: 'Bella Vista Restaurant'
  }
};

export const mockCampaigns = [
  {
    id: 'mock-campaign-1',
    businessId: 'mock-biz-1',
    title: 'Weekend Brunch Campaign',
    description: 'Drive weekend brunch traffic with influencer partnerships',
    budget: 2000,
    spent: 650,
    status: 'ACTIVE',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-05-31'),
    targetAudience: 'food_lovers',
    expectedROAS: 3.0,
    actualROAS: 3.2,
    participatingInfluencers: 8,
    totalRedemptions: 23,
    createdAt: new Date('2024-01-25')
  },
  {
    id: 'mock-campaign-2',
    businessId: 'mock-biz-2',
    title: 'Spring Menu Launch',
    description: 'Promote new spring menu items',
    budget: 1500,
    spent: 420,
    status: 'ACTIVE',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-04-30'),
    targetAudience: 'health_conscious',
    expectedROAS: 2.5,
    actualROAS: 2.8,
    participatingInfluencers: 5,
    totalRedemptions: 12,
    createdAt: new Date('2024-02-20')
  }
];

export const mockRequests = [
  {
    id: 'mock-request-1',
    influencerId: 'mock-inf-1',
    businessId: 'mock-biz-1',
    offerId: 'mock-offer-1',
    status: 'PENDING',
    message: 'I would love to promote your weekend brunch! My audience loves trying new restaurants.',
    requestedAt: new Date('2024-02-25'),
    influencerName: 'Sarah Johnson',
    businessName: 'Bella Vista Restaurant',
    offerTitle: '30% Off Weekend Brunch'
  },
  {
    id: 'mock-request-2',
    influencerId: 'mock-inf-3',
    businessId: 'mock-biz-2',
    offerId: 'mock-offer-2',
    status: 'APPROVED',
    message: 'Excited to try your new spring menu and share with my followers!',
    requestedAt: new Date('2024-02-28'),
    approvedAt: new Date('2024-03-01'),
    influencerName: 'Emma Davis',
    businessName: 'Urban Eats',
    offerTitle: '$10 Off Orders Over $40'
  }
];

/**
 * Helper function to simulate pagination with mock data
 */
export function paginateMockData<T>(data: T[], page: number = 1, limit: number = 10) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: endIndex < data.length,
      hasPrev: page > 1
    }
  };
}

/**
 * Helper function to filter mock data by criteria
 */
export function filterMockData<T extends Record<string, any>>(
  data: T[],
  filters: Record<string, any>
): T[] {
  return data.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true;
      if (Array.isArray(value)) {
        return value.includes(item[key]);
      }
      if (typeof value === 'string') {
        return item[key]?.toString().toLowerCase().includes(value.toLowerCase());
      }
      return item[key] === value;
    });
  });
}

/**
 * Generate 203 mock influencers to simulate the real database
 */
export function generate203MockInfluencers() {
  const tiers = ['S', 'M', 'L', 'XL', 'Huge'];
  const platforms = ['instagram', 'tiktok', 'both'];
  const locations = ['San Francisco, CA', 'Los Angeles, CA', 'New York, NY', 'Austin, TX', 'Miami, FL', 'Seattle, WA', 'Chicago, IL', 'Denver, CO'];
  
  return Array.from({ length: 203 }, (_, i) => {
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const baseFollowers = tier === 'S' ? 1000 : tier === 'M' ? 10000 : tier === 'L' ? 50000 : tier === 'XL' ? 100000 : 500000;
    const followers = baseFollowers + Math.floor(Math.random() * baseFollowers);
    
    return {
      id: `influencer-${i + 1}`,
      displayName: `Influencer ${i + 1}`,
      handle: `@influencer${i + 1}`,
      email: `influencer${i + 1}@example.com`,
      tier,
      followers,
      platform,
      verified: Math.random() > 0.7,
      location: locations[Math.floor(Math.random() * locations.length)],
      bio: `Content creator specializing in lifestyle and ${platform === 'instagram' ? 'photography' : 'short videos'}`,
      engagementRate: Math.round((Math.random() * 8 + 2) * 100) / 100, // 2-10%
      status: 'ACTIVE',
      joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      totalEarnings: Math.round(Math.random() * 5000 * 100) / 100,
      totalRedemptions: Math.floor(Math.random() * 50)
    };
  });
}

/**
 * Check if we should use mock data based on environment or quota status
 */
export function shouldUseMockData(): boolean {
  // Use mock data if Firebase is not properly configured or quota exceeded
  const quotaExceeded = process.env.FIRESTORE_QUOTA_EXCEEDED === 'true';
  const firebaseNotConfigured = !process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY.includes('REPLACE_THIS');
  return quotaExceeded || firebaseNotConfigured;
}
