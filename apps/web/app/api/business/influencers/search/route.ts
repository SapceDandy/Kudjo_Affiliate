import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { z } from 'zod';

// Initialize Firebase Admin
function getAdminDb() {
  try {
    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      
      if (privateKey && clientEmail && projectId) {
        const app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
        return getFirestore(app);
      }
    }
    
    return getFirestore();
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

const SearchInfluencersSchema = z.object({
  query: z.string().optional(),
  tier: z.enum(['Nano', 'Micro', 'Mid', 'Macro', 'Mega']).optional(),
  minFollowers: z.number().optional(),
  maxFollowers: z.number().optional(),
  location: z.string().optional(),
  verified: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0)
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const queryParams = {
      query: searchParams.get('query') || undefined,
      tier: searchParams.get('tier') as any || undefined,
      minFollowers: searchParams.get('minFollowers') ? parseInt(searchParams.get('minFollowers')!) : undefined,
      maxFollowers: searchParams.get('maxFollowers') ? parseInt(searchParams.get('maxFollowers')!) : undefined,
      location: searchParams.get('location') || undefined,
      verified: searchParams.get('verified') === 'true' ? true : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    const parsed = SearchInfluencersSchema.parse(queryParams);

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured' 
      }, { status: 500 });
    }

    // Build query based on filters
    let influencersRef = adminDb!.collection('influencers');
    let query: any = influencersRef;

    // Apply filters
    if (parsed.tier) {
      query = query.where('tier', '==', parsed.tier);
    }

    if (parsed.minFollowers) {
      query = query.where('followers', '>=', parsed.minFollowers);
    }

    if (parsed.maxFollowers) {
      query = query.where('followers', '<=', parsed.maxFollowers);
    }

    if (parsed.verified !== undefined) {
      query = query.where('verified', '==', parsed.verified);
    }

    // Add ordering and pagination
    query = query.orderBy('followers', 'desc').limit(parsed.limit + 1); // +1 to check hasMore

    const snapshot = await query.get();
    
    let influencers = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.displayName || 'Unknown Influencer',
        username: data.username || data.handle,
        followers: data.followers || 0,
        tier: data.tier || 'Nano',
        verified: data.verified || false,
        location: data.location,
        bio: data.bio,
        profileImage: data.profileImage || data.photoURL,
        platforms: data.platforms || ['instagram'],
        engagementRate: data.engagementRate || 0,
        categories: data.categories || [],
        lastActive: data.lastActive?.toDate?.() || data.updatedAt?.toDate?.() || new Date(),
        joinedAt: data.createdAt?.toDate?.() || new Date()
      };
    });

    // Apply text search filter (client-side for simplicity)
    if (parsed.query) {
      const searchTerm = parsed.query.toLowerCase();
      influencers = influencers.filter((inf: any) => 
        inf.name.toLowerCase().includes(searchTerm) ||
        inf.username?.toLowerCase().includes(searchTerm) ||
        inf.bio?.toLowerCase().includes(searchTerm) ||
        inf.categories?.some((cat: string) => cat.toLowerCase().includes(searchTerm))
      );
    }

    // Apply location filter (client-side)
    if (parsed.location) {
      const locationTerm = parsed.location.toLowerCase();
      influencers = influencers.filter((inf: any) => 
        inf.location?.toLowerCase().includes(locationTerm)
      );
    }

    // Apply pagination
    const hasMore = influencers.length > parsed.limit;
    if (hasMore) {
      influencers = influencers.slice(0, parsed.limit);
    }

    const paginatedInfluencers = influencers.slice(parsed.offset, parsed.offset + parsed.limit);
    const nextOffset = hasMore && (parsed.offset + parsed.limit < influencers.length) 
      ? parsed.offset + parsed.limit 
      : null;

    return NextResponse.json({
      influencers: paginatedInfluencers,
      hasMore: nextOffset !== null,
      nextOffset,
      total: influencers.length
    });

  } catch (error: any) {
    console.error('Error searching influencers:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search influencers', details: error.message },
      { status: 500 }
    );
  }
}
