import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { format, subDays } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy admin init to avoid duplicate app errors
let adminAppInitialized = false;

function tryLoadServiceAccount(): any | null {
  const candidates = [
    // Running from apps/web -> repo root scripts
    path.resolve(process.cwd(), '../../scripts/firebase-service-account.json'),
    // Running from repo root
    path.resolve(process.cwd(), 'scripts/firebase-service-account.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const svc = JSON.parse(raw);
        svc.private_key = (svc.private_key || '').replace(/\\n/g, '\n');
        return svc;
      }
    } catch (err) {
      console.error(`Error loading service account from ${p}:`, err);
    }
  }
  return null;
}

async function getAdmin() {
  const admin = await import('firebase-admin');
  
  if (!adminAppInitialized) {
    try {
      // Prefer env-based creds
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        if (admin.apps.length === 0) {
          admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
        }
      } else {
        const svc = tryLoadServiceAccount();
        if (!svc) {
          throw new Error('Missing Firebase Admin credentials. Set FIREBASE_* envs or add scripts/firebase-service-account.json');
        }
        if (admin.apps.length === 0) {
          admin.initializeApp({ credential: admin.credential.cert(svc) });
        }
      }
      adminAppInitialized = true;
    } catch (err) {
      console.error('Failed to initialize admin app:', err);
      throw err;
    }
  }

  return admin;
}

// Query validation schema
const AdminCouponsListQuery = z.object({
  status: z.enum(['issued', 'active', 'redeemed', 'expired']).optional(),
  bizId: z.string().optional(),
  infId: z.string().optional(),
  type: z.enum(['AFFILIATE', 'CONTENT_MEAL']).optional(),
  q: z.string().optional(), // search query
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  refresh: z.boolean().optional(),
});

// Generate mock coupons for fallback
function generateMockCoupons(count = 20) {
  const coupons = [];
  const statuses = ['issued', 'active', 'redeemed', 'expired'];
  const types = ['AFFILIATE', 'CONTENT_MEAL'];
  
  for (let i = 0; i < count; i++) {
    const createdAt = subDays(new Date(), Math.floor(Math.random() * 30)).toISOString();
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const bizId = `biz_${Math.floor(Math.random() * 100)}`;
    const infId = `inf_${Math.floor(Math.random() * 100)}`;
    
    coupons.push({
      id: `coupon_${i}`,
      code: `CODE${Math.floor(1000 + Math.random() * 9000)}`,
      type,
      status,
      bizId,
      infId,
      createdAt,
      deadlineAt: status === 'expired' ? subDays(new Date(), Math.floor(Math.random() * 10)).toISOString() : null,
      cap_cents: Math.floor(5000 + Math.random() * 10000),
      admin: {
        posAdded: Math.random() > 0.5,
        posAddedAt: Math.random() > 0.5 ? subDays(new Date(), Math.floor(Math.random() * 20)).toISOString() : null,
      },
      business: {
        name: `Business ${bizId.split('_')[1]}`
      },
      influencer: {
        handle: `influencer${infId.split('_')[1]}`
      }
    });
  }
  
  return coupons;
}

// Simple in-memory cache with expiration
interface CouponsCache {
  coupons: any[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  filters: {
    status?: string;
    bizId?: string;
    infId?: string;
    type?: string;
    q?: string;
  };
  timestamp: number;
}

const couponsCache: {
  [key: string]: CouponsCache;
} = {};

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Generate cache key based on query params
function generateCacheKey(params: any): string {
  return `${params.status || ''}_${params.bizId || ''}_${params.infId || ''}_${params.type || ''}_${params.q || ''}_${params.limit}_${params.cursor || ''}`;
}

// Check if cache is valid
function isCacheValid(cacheKey: string): boolean {
  const cache = couponsCache[cacheKey];
  if (!cache) return false;
  
  const now = Date.now();
  return (now - cache.timestamp) < CACHE_TTL;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Admin coupons list API called');

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      bizId: searchParams.get('bizId') || undefined,
      infId: searchParams.get('infId') || undefined,
      type: searchParams.get('type') || undefined,
      q: searchParams.get('q') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      cursor: searchParams.get('cursor') || undefined,
      refresh: searchParams.get('refresh') === 'true',
    };

    const validatedQuery = AdminCouponsListQuery.parse(queryParams);
    console.log('Query params:', validatedQuery);

    // Check cache first (unless refresh is requested)
    const cacheKey = generateCacheKey(validatedQuery);
    if (!validatedQuery.refresh && isCacheValid(cacheKey)) {
      console.log('Returning cached coupons data');
      const cachedData = couponsCache[cacheKey];
      return NextResponse.json({
        coupons: cachedData.coupons,
        pagination: cachedData.pagination,
        filters: cachedData.filters,
        fromCache: true
      });
    }

    let enrichedCoupons = [];
    let nextCursor = null;

    try {
      // Get admin SDK
      const admin = await getAdmin();
      const db = admin.firestore();

      let couponsRef = db.collection('coupons');
      let couponsQuery = couponsRef.orderBy('createdAt', 'desc');

      // Apply filters
      if (validatedQuery.status) {
        couponsQuery = couponsQuery.where('status', '==', validatedQuery.status);
      }
      if (validatedQuery.bizId) {
        couponsQuery = couponsQuery.where('bizId', '==', validatedQuery.bizId);
      }
      if (validatedQuery.infId) {
        couponsQuery = couponsQuery.where('infId', '==', validatedQuery.infId);
      }
      if (validatedQuery.type) {
        couponsQuery = couponsQuery.where('type', '==', validatedQuery.type);
      }

      // Apply cursor if provided
      if (validatedQuery.cursor) {
        const cursorDoc = await db.collection('coupons').doc(validatedQuery.cursor).get();
        if (cursorDoc.exists) {
          couponsQuery = couponsQuery.startAfter(cursorDoc);
        }
      }

      // Apply pagination with a smaller limit to reduce quota usage
      const effectiveLimit = Math.min(validatedQuery.limit, 10); // Cap at 10 items per request
      couponsQuery = couponsQuery.limit(effectiveLimit);

      // Execute query
      const snapshot = await couponsQuery.get();

      console.log(`Found ${snapshot.size} coupons`);

      const coupons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get unique business and influencer IDs for joining
      const bizIds = Array.from(new Set(coupons.map((c: any) => c.bizId).filter(Boolean)));
      const infIds = Array.from(new Set(coupons.map((c: any) => c.infId).filter(Boolean)));

      console.log(`Found ${bizIds.length} unique businesses and ${infIds.length} unique influencers`);

      // Skip fetching related data if there are too many IDs
      // This significantly reduces Firestore operations
      let businesses = new Map();
      let influencers = new Map();

      if (bizIds.length > 0 && bizIds.length <= 3) {
        try {
          const bizBatches = [];
          for (let i = 0; i < bizIds.length; i += 3) { // Smaller batch size
            const batchIds = bizIds.slice(i, i + 3);
            bizBatches.push(
              db.collection('businesses')
                .where(admin.firestore.FieldPath.documentId(), 'in', batchIds)
                .get()
            );
          }
          const bizResults = await Promise.all(bizBatches);
          
          bizResults.forEach(batch => {
            batch.docs.forEach((doc: any) => {
              businesses.set(doc.id, doc.data());
            });
          });
        } catch (err) {
          console.error('Error fetching business data:', err);
        }
      }

      if (infIds.length > 0 && infIds.length <= 3) {
        try {
          const infBatches = [];
          for (let i = 0; i < infIds.length; i += 3) { // Smaller batch size
            const batchIds = infIds.slice(i, i + 3);
            infBatches.push(
              db.collection('influencers')
                .where(admin.firestore.FieldPath.documentId(), 'in', batchIds)
                .get()
            );
          }
          const infResults = await Promise.all(infBatches);
          
          infResults.forEach(batch => {
            batch.docs.forEach((doc: any) => {
              influencers.set(doc.id, doc.data());
            });
          });
        } catch (err) {
          console.error('Error fetching influencer data:', err);
        }
      }

      // Join data and apply text search if needed
      enrichedCoupons = coupons.map((coupon: any) => ({
        ...coupon,
        business: coupon.bizId ? businesses.get(coupon.bizId) || { name: `Business ${coupon.bizId}` } : null,
        influencer: coupon.infId ? influencers.get(coupon.infId) || { handle: `@influencer${coupon.infId}` } : null,
      }));

      // Apply text search filter if provided
      if (validatedQuery.q && validatedQuery.q.trim()) {
        const searchTerm = validatedQuery.q.toLowerCase().trim();
        enrichedCoupons = enrichedCoupons.filter((coupon: any) => {
          const businessName = coupon.business?.name?.toLowerCase() || '';
          const influencerName = coupon.influencer?.handle?.toLowerCase() || '';
          const code = coupon.code?.toLowerCase() || '';

          return businessName.includes(searchTerm) ||
                 influencerName.includes(searchTerm) ||
                 code.includes(searchTerm);
        });
      }

      // Calculate next cursor for pagination
      nextCursor = snapshot.size === effectiveLimit
        ? snapshot.docs[snapshot.docs.length - 1].id
        : null;

      // Store in cache
      couponsCache[cacheKey] = {
        coupons: enrichedCoupons,
        pagination: {
          limit: validatedQuery.limit,
          hasMore: !!nextCursor,
          nextCursor,
        },
        filters: {
          status: validatedQuery.status,
          bizId: validatedQuery.bizId,
          infId: validatedQuery.infId,
          type: validatedQuery.type,
          q: validatedQuery.q,
        },
        timestamp: Date.now()
      };

    } catch (error: any) {
      console.error('Error fetching real coupons data:', error);

      // If we hit quota limits or other errors, use mock data
      if (error.code === 8 || error.message?.includes('Quota exceeded')) {
        console.log('Using mock coupon data due to quota limits');
        enrichedCoupons = generateMockCoupons(validatedQuery.limit);
        nextCursor = 'mock_cursor'; // Indicate mock data, no real pagination
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    return NextResponse.json({
      coupons: enrichedCoupons,
      pagination: {
        limit: validatedQuery.limit,
        hasMore: !!nextCursor,
        nextCursor,
      },
      filters: {
        status: validatedQuery.status,
        bizId: validatedQuery.bizId,
        infId: validatedQuery.infId,
        type: validatedQuery.type,
        q: validatedQuery.q,
      },
      isMockData: nextCursor === 'mock_cursor' // Indicate if mock data is used
    });
  } catch (error) {
    console.error('Admin coupons list error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.message },
        { status: 400 }
      );
    }

    // Return mock data as fallback for any error
    const mockCoupons = generateMockCoupons(20);
    
    return NextResponse.json({
      coupons: mockCoupons,
      pagination: {
        limit: 20,
        hasMore: false,
        nextCursor: null,
      },
      filters: {},
      isMockData: true
    });
  }
} 