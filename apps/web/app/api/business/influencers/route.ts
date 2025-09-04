import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firebaseCache } from '@/lib/firebase-cache';

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

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
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

    // Get influencers that don't have active assignments with this business
    let snapshot;
    let assignedInfluencerIds = new Set<string>();
    
    try {
      // First get all influencers
      snapshot = await adminDb.collection('influencers').get();
      
      // Get existing assignments for this business to filter out already assigned influencers
      const assignmentsSnapshot = await adminDb.collection('offer_assignments')
        .where('businessId', '==', businessId)
        .where('status', '==', 'active')
        .get();
      
      assignedInfluencerIds = new Set(
        assignmentsSnapshot.docs.map(doc => doc.data().influencerId)
      );
      
      console.log(`Found ${snapshot.docs.length} total influencers, ${assignedInfluencerIds.size} already assigned to business ${businessId}`);
      
    } catch (error: any) {
      console.error('Firebase query failed:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch influencers from database', details: error.message },
        { status: 500 }
      );
    }
    
    // Process and filter influencers (exclude those with active assignments)
    const allInfluencers = snapshot.docs
      .filter(doc => !assignedInfluencerIds.has(doc.id))
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          handle: data.handle || '',
          displayName: data.name || data.displayName || '',
          name: data.name || data.displayName || '',
          followers: data.followers || 0,
          avgViews: data.avgViews || 0,
          tier: data.tier || 'Bronze',
          platforms: data.platforms || [],
          platform: data.platforms?.[0] || 'instagram',
          location: data.location || '',
          bio: data.bio || '',
          profileImage: data.profileImage || '',
          verified: data.verified || false,
          createdAt: data.createdAt,
          status: data.status || 'active'
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
        (inf.displayName && inf.displayName.toLowerCase().includes(searchLower)) ||
        (inf.email && inf.email.toLowerCase().includes(searchLower)) ||
        (inf.bio && inf.bio.toLowerCase().includes(searchLower)) ||
        (inf.handle && inf.handle.toLowerCase().includes(searchLower))
      );
    }

    // Apply platform filter
    if (platform && platform !== 'all') {
      if (platform === 'both') {
        filteredInfluencers = filteredInfluencers.filter((inf: any) => 
          inf.platforms && inf.platforms.length >= 2
        );
      } else {
        filteredInfluencers = filteredInfluencers.filter((inf: any) => 
          inf.platforms && inf.platforms.includes(platform)
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
