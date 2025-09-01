import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firebaseCache } from '@/lib/firebase-cache';
import { safeFirestoreQuery } from '@/lib/quota-manager';
import { generate203MockInfluencers, shouldUseMockData } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const search = searchParams.get('search') || '';
    const minFollowers = parseInt(searchParams.get('minFollowers') || '0');
    const maxFollowers = parseInt(searchParams.get('maxFollowers') || '999999999');
    const tier = searchParams.get('tier') || '';
    const platform = searchParams.get('platform') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    // Use mock data if Firebase is not configured or quota exceeded
    if (shouldUseMockData() || !adminDb) {
      console.log('Using mock data for influencer search - Firebase not configured or quota exceeded');
      const mockInfluencers = generate203MockInfluencers();
      let filteredInfluencers = mockInfluencers;

      // Apply filters
      if (minFollowers > 0) {
        filteredInfluencers = filteredInfluencers.filter(inf => inf.followers >= minFollowers);
      }
      if (maxFollowers < 999999999) {
        filteredInfluencers = filteredInfluencers.filter(inf => inf.followers <= maxFollowers);
      }
      if (tier) {
        filteredInfluencers = filteredInfluencers.filter(inf => inf.tier === tier);
      }
      if (platform && platform !== 'all') {
        if (platform === 'both') {
          filteredInfluencers = filteredInfluencers.filter(inf => inf.platform === 'both');
        } else {
          filteredInfluencers = filteredInfluencers.filter(inf => 
            inf.platform === platform || inf.platform === 'both'
          );
        }
      }
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        filteredInfluencers = filteredInfluencers.filter(inf => 
          inf.displayName.toLowerCase().includes(searchLower) ||
          inf.email.toLowerCase().includes(searchLower) ||
          inf.bio.toLowerCase().includes(searchLower) ||
          inf.handle.toLowerCase().includes(searchLower)
        );
      }

      const totalCount = filteredInfluencers.length;
      const paginatedInfluencers = filteredInfluencers.slice(offset, offset + limit);

      return NextResponse.json({ 
        influencers: paginatedInfluencers,
        total: totalCount,
        count: paginatedInfluencers.length,
        offset,
        hasMore: offset + paginatedInfluencers.length < totalCount,
        source: 'mock_203_influencers'
      });
    }

    // Check cache first to avoid quota usage
    const cacheKey = `influencers:${search}:${tier}:${platform}:${minFollowers}:${maxFollowers}`;
    const cachedData = firebaseCache.get<any[]>(cacheKey);
    if (cachedData && Array.isArray(cachedData)) {
      const paginatedInfluencers = cachedData.slice(offset, offset + limit);
      return NextResponse.json({ 
        influencers: paginatedInfluencers,
        total: cachedData.length,
        count: paginatedInfluencers.length,
        offset,
        hasMore: offset + paginatedInfluencers.length < cachedData.length
      });
    }

    // Get all influencers from Firebase (remove limit to get all 203)
    let snapshot;
    try {
      snapshot = await safeFirestoreQuery(
        'business-influencers',
        () => adminDb.collection('influencers').get()
      ) as any;
    } catch (error: any) {
      // If quota exceeded or any Firebase error, fall back to mock data
      console.log('Firebase query failed, falling back to mock data:', error.message);
      const mockInfluencers = generate203MockInfluencers();
      let filteredInfluencers = mockInfluencers;

      // Apply same filters as above
      if (minFollowers > 0) {
        filteredInfluencers = filteredInfluencers.filter(inf => inf.followers >= minFollowers);
      }
      if (maxFollowers < 999999999) {
        filteredInfluencers = filteredInfluencers.filter(inf => inf.followers <= maxFollowers);
      }
      if (tier) {
        filteredInfluencers = filteredInfluencers.filter(inf => inf.tier === tier);
      }
      if (platform && platform !== 'all') {
        if (platform === 'both') {
          filteredInfluencers = filteredInfluencers.filter(inf => inf.platform === 'both');
        } else {
          filteredInfluencers = filteredInfluencers.filter(inf => 
            inf.platform === platform || inf.platform === 'both'
          );
        }
      }
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        filteredInfluencers = filteredInfluencers.filter(inf => 
          inf.displayName.toLowerCase().includes(searchLower) ||
          inf.email.toLowerCase().includes(searchLower) ||
          inf.bio.toLowerCase().includes(searchLower) ||
          inf.handle.toLowerCase().includes(searchLower)
        );
      }

      const totalCount = filteredInfluencers.length;
      const paginatedInfluencers = filteredInfluencers.slice(offset, offset + limit);

      return NextResponse.json({ 
        influencers: paginatedInfluencers,
        total: totalCount,
        count: paginatedInfluencers.length,
        offset,
        hasMore: offset + paginatedInfluencers.length < totalCount,
        source: 'mock_fallback_203_influencers'
      });
    }
    console.log(`Found ${snapshot.docs.length} influencer documents in Firestore`);
    
    let allInfluencers = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      console.log(`Processing influencer: ${doc.id}`, data);
      return {
        id: doc.id,
        displayName: data.displayName || data.handle || data.name || 'Unknown',
        email: data.email || '',
        followers: data.followers || 0,
        tier: data.tier || 'S',
        platform: data.platform || 'instagram',
        verified: data.verified || false,
        location: data.location || '',
        bio: data.bio || '',
        engagementRate: data.engagementRate || 0,
        handle: data.handle || data.displayName || 'unknown'
      };
    });

    // Sort by followers descending
    allInfluencers.sort((a: any, b: any) => b.followers - a.followers);

    // Apply client-side filters
    let filteredInfluencers = allInfluencers;

    if (minFollowers > 0) {
      filteredInfluencers = filteredInfluencers.filter((inf: any) => inf.followers >= minFollowers);
    }
    if (maxFollowers < 999999999) {
      filteredInfluencers = filteredInfluencers.filter((inf: any) => inf.followers <= maxFollowers);
    }
    if (tier) {
      filteredInfluencers = filteredInfluencers.filter((inf: any) => inf.tier === tier);
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredInfluencers = filteredInfluencers.filter((inf: any) => 
        inf.displayName.toLowerCase().includes(searchLower) ||
        inf.email.toLowerCase().includes(searchLower) ||
        inf.bio.toLowerCase().includes(searchLower) ||
        inf.handle.toLowerCase().includes(searchLower)
      );
    }

    // Apply platform filter
    if (platform && platform !== 'all') {
      if (platform === 'both') {
        filteredInfluencers = filteredInfluencers.filter((inf: any) => inf.platform === 'both');
      } else {
        filteredInfluencers = filteredInfluencers.filter((inf: any) => 
          inf.platform === platform || inf.platform === 'both'
        );
      }
    }

    const totalCount = filteredInfluencers.length;
    const paginatedInfluencers = filteredInfluencers.slice(offset, offset + limit);

    // Cache the filtered results for 60 seconds
    firebaseCache.set(cacheKey, filteredInfluencers, 60000);

    return NextResponse.json({ 
      influencers: paginatedInfluencers,
      total: totalCount,
      count: paginatedInfluencers.length,
      offset,
      hasMore: offset + paginatedInfluencers.length < totalCount
    });

  } catch (error: any) {
    console.error('Error fetching influencers:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch influencers', details: error.message },
      { status: 500 }
    );
  }
}
