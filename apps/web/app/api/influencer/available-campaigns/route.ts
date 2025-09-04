import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firebaseCache } from '@/lib/firebase-cache';
import { safeFirestoreQuery } from '@/lib/quota-manager';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const infId = searchParams.get('infId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // Search and filter parameters
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';
    const businessNameFilter = searchParams.get('businessName')?.toLowerCase() || '';
    const minSplitPct = searchParams.get('minSplitPct') ? parseInt(searchParams.get('minSplitPct')!) : null;
    const maxSplitPct = searchParams.get('maxSplitPct') ? parseInt(searchParams.get('maxSplitPct')!) : null;
    const discountTypeFilter = searchParams.get('discountType') || '';
    
    if (!infId) {
      return NextResponse.json({ error: 'infId required' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }


    // Get influencer tier - create if doesn't exist for demo
    let influencerDoc = await adminDb!.collection('influencers').doc(infId).get();
    if (!influencerDoc.exists) {
      // Create demo influencer
      await adminDb!.collection('influencers').doc(infId).set({
        id: infId,
        tier: 'M',
        name: 'Demo Influencer',
        handle: 'demo_influencer',
        followers: 25000,
        createdAt: new Date()
      });
      influencerDoc = await adminDb!.collection('influencers').doc(infId).get();
    }

    const influencerData = influencerDoc.data()!;
    const influencerTier = influencerData.tier || 'S';

    // Query offers - get all offers first, then filter
    const offersRef = adminDb!.collection('offers');
    
    // Get all offers and filter in memory to avoid index issues
    let offersSnapshot = await offersRef.get();
    console.log(`Found ${offersSnapshot.docs.length} total offers in database`);
    
    // Log first few offers to debug
    if (offersSnapshot.docs.length > 0) {
      const firstOffer = offersSnapshot.docs[0].data();
      console.log('Sample offer data:', {
        id: offersSnapshot.docs[0].id,
        title: firstOffer.title,
        active: firstOffer.active,
        status: firstOffer.status,
        bizId: firstOffer.bizId
      });
    }

    
    // Filter offers by eligibility and get business info
    const eligibleOffers = [];
    const businessIds = new Set<string>();

    // Get business details first for filtering
    const businessMap = new Map();
    const allBusinessDocs = await adminDb!.collection('businesses').get();
    allBusinessDocs.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      businessMap.set(doc.id, {
        name: data.name || data.businessName || 'Unknown Business',
        address: data.address,
        phone: data.phone,
      });
    });

    // Filter all offers first, then apply pagination
    const allEligibleOffers = [];
    
    for (const doc of offersSnapshot.docs) {
      const data = doc.data();
      
      // Check tier eligibility
      if (data.eligibility?.tiers && !data.eligibility.tiers.includes(influencerTier)) {
        continue;
      }

      // Check if offer has ended - handle different date formats
      if (data.endAt) {
        const endDate = data.endAt.toDate ? data.endAt.toDate() : new Date(data.endAt);
        if (endDate < new Date()) {
          continue;
        }
      }

      // Apply search filter
      if (searchQuery) {
        const title = (data.title || '').toLowerCase();
        const description = (data.description || '').toLowerCase();
        const businessName = (businessMap.get(data.bizId)?.name || '').toLowerCase();
        
        if (!title.includes(searchQuery) && 
            !description.includes(searchQuery) && 
            !businessName.includes(searchQuery)) {
          continue;
        }
      }

      // Apply business name filter
      if (businessNameFilter) {
        const businessName = (businessMap.get(data.bizId)?.name || '').toLowerCase();
        if (!businessName.includes(businessNameFilter)) {
          continue;
        }
      }

      // Apply split percentage filters
      if (minSplitPct !== null && (data.splitPct || 0) < minSplitPct) {
        continue;
      }

      if (maxSplitPct !== null && (data.splitPct || 0) > maxSplitPct) {
        continue;
      }

      // Apply discount type filter
      if (discountTypeFilter && data.discountType !== discountTypeFilter) {
        continue;
      }

      // Skip complex checks while indexes are building
      // TODO: Re-enable max influencers and cooldown checks once indexes are ready

      allEligibleOffers.push({
        id: doc.id,
        ...data,
      });
    }

    // Sort by expiration date (soonest to expire first)
    allEligibleOffers.sort((a: any, b: any) => {
      const aEndDate = a.endAt ? (a.endAt.toDate ? a.endAt.toDate() : new Date(a.endAt)) : new Date('2099-12-31');
      const bEndDate = b.endAt ? (b.endAt.toDate ? b.endAt.toDate() : new Date(b.endAt)) : new Date('2099-12-31');
      return aEndDate.getTime() - bEndDate.getTime();
    });

    // Apply pagination to eligible offers
    const paginatedOffers = allEligibleOffers.slice(offset, offset + limit);
    
    // Collect business IDs for the paginated offers
    for (const offer of paginatedOffers) {
      businessIds.add((offer as any).bizId);
    }

    const campaigns = paginatedOffers.map((offer: any) => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      businessName: offer.businessName,
      businessId: offer.bizId,
      splitPct: offer.splitPct,
      discountType: offer.discountType,
      userDiscountPct: offer.userDiscountPct,
      userDiscountCents: offer.userDiscountCents,
      minSpendCents: offer.minSpendCents,
      eligibleTiers: offer.eligibleTiers,
      maxInfluencers: offer.maxInfluencers,
      currentInfluencers: 0, // Will be calculated if needed
      maxRedemptions: offer.maxRedemptions,
      currentRedemptions: 0, // Will be calculated if needed
      endAt: offer.endAt ? (offer.endAt.toDate ? offer.endAt.toDate() : new Date(offer.endAt)) : null,
      status: 'active',
      createdAt: offer.createdAt ? (offer.createdAt.toDate ? offer.createdAt.toDate() : new Date(offer.createdAt)) : new Date(),
    }));

    const hasMore = allEligibleOffers.length > offset + limit;
    const nextOffset = hasMore ? offset + limit : null;

    return NextResponse.json({
      campaigns,
      hasMore,
      nextOffset,
      influencerTier,
    });

  } catch (error: any) {
    console.error('Error fetching available campaigns:', error);
    
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
