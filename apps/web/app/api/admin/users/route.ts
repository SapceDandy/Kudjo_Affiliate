import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy admin init to avoid duplicate app errors
let adminAppInitialized = false;

function tryLoadServiceAccount(): any | null {
  const candidates = [
    path.resolve(process.cwd(), '../../scripts/firebase-service-account.json'),
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
const AdminUsersListQuery = z.object({
  role: z.enum(['influencer', 'business']).optional(),
  status: z.enum(['active', 'pending', 'suspended']).optional(),
  q: z.string().optional(), // search query
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// Generate mock users for fallback
function generateMockUsers(count = 20) {
  const users = [];
  const roles = ['influencer', 'business'];
  const statuses = ['active', 'pending', 'suspended'];

  for (let i = 0; i < count; i++) {
    const role = roles[Math.floor(Math.random() * roles.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdAt = new Date(Date.now() - Math.random() * 10000000000).toISOString();
    const lastLoginAt = Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : null;

    const baseUser = {
      id: `user_${i}`,
      email: `user${i}@example.com`,
      displayName: `User ${i}`,
      role,
      status,
      createdAt,
      lastLoginAt,
    };

    if (role === 'influencer') {
      users.push({
        ...baseUser,
        id: `inf_${i}`,
        handle: `@influencer${i}`,
        followers: Math.floor(1000 + Math.random() * 100000),
      });
    } else {
      users.push({
        ...baseUser,
        id: `biz_${i}`,
        businessName: `Business ${i}`,
        industry: ['Retail', 'Food & Beverage', 'Technology', 'Fashion', 'Health & Wellness'][Math.floor(Math.random() * 5)],
      });
    }
  }
  return users;
}

// GET handler for listing users
export async function GET(request: NextRequest) {
  console.log('Admin users list API called');

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = {
    role: searchParams.get('role') || undefined,
    status: searchParams.get('status') || undefined,
    q: searchParams.get('q') || undefined,
    limit: parseInt(searchParams.get('limit') || '20'),
    cursor: searchParams.get('cursor') || undefined,
  };

  try {
    const validatedQuery = AdminUsersListQuery.parse(queryParams);
    console.log('Query params:', validatedQuery);

    let users = [];
    let nextCursor = null;

    try {
      // Get admin SDK
      const admin = await getAdmin();
      const db = admin.firestore();
      const auth = admin.auth();

      // Determine which collections to query based on role
      let collections = [];
      if (validatedQuery.role === 'influencer') {
        collections = ['influencers'];
      } else if (validatedQuery.role === 'business') {
        collections = ['businesses'];
      } else {
        collections = ['influencers', 'businesses'];
      }

      // Execute queries for each collection
      const results = await Promise.all(collections.map(async (collection) => {
        let query: any = db.collection(collection);

        // Apply status filter if provided
        if (validatedQuery.status) {
          query = query.where('status', '==', validatedQuery.status);
        }

        // Apply cursor if provided
        if (validatedQuery.cursor && validatedQuery.cursor.startsWith(`${collection}_`)) {
          const cursorId = validatedQuery.cursor.split('_')[1];
          const cursorDoc = await db.collection(collection).doc(cursorId).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }

        // Apply limit
        query = query.limit(validatedQuery.limit);

        // Execute query
        const snapshot = await query.get();
        return { collection, docs: snapshot.docs };
      }));

      // Process results
      const allDocs = [];
      for (const result of results) {
        const { collection, docs } = result;
        for (const doc of docs) {
          const data = doc.data();
          const userId = doc.id;

          // Try to get auth user data
          let authUser = null;
          try {
            authUser = await auth.getUser(userId);
          } catch (err) {
            console.log(`User ${userId} not found in auth`);
          }

          // Combine data
          const user = {
            id: `${collection.slice(0, -1)}_${userId}`, // e.g., inf_123 or biz_456
            email: authUser?.email || data.email || `unknown_${userId}@example.com`,
            displayName: authUser?.displayName || data.name || `Unknown ${userId}`,
            role: collection === 'influencers' ? 'influencer' : 'business',
            status: data.status || 'active',
            createdAt: data.createdAt || null,
            lastLoginAt: authUser?.metadata?.lastSignInTime || null,
            // Collection-specific fields
            ...(collection === 'influencers' ? {
              handle: data.handle || `@${userId}`,
              followers: data.followers || 0,
            } : {
              businessName: data.name || `Business ${userId}`,
              industry: data.industry || 'Other',
            }),
          };

          allDocs.push(user);
        }
      }

      // Apply text search filter if provided
      if (validatedQuery.q && validatedQuery.q.trim()) {
        const searchTerm = validatedQuery.q.toLowerCase().trim();
        users = allDocs.filter((user: any) => {
          const email = user.email?.toLowerCase() || '';
          const displayName = user.displayName?.toLowerCase() || '';
          const handle = user.handle?.toLowerCase() || '';
          const businessName = user.businessName?.toLowerCase() || '';

          return email.includes(searchTerm) ||
                 displayName.includes(searchTerm) ||
                 handle.includes(searchTerm) ||
                 businessName.includes(searchTerm);
        });
      } else {
        users = allDocs;
      }

      // Sort by creation date (newest first)
      users.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Calculate next cursor for pagination
      if (users.length === validatedQuery.limit) {
        nextCursor = users[users.length - 1].id;
      }

    } catch (error: any) {
      console.error('Error fetching real users data:', error);

      // If we hit quota limits or other errors, use mock data
      if (error.code === 8 || error.message?.includes('Quota exceeded')) {
        console.log('Using mock user data due to quota limits');
        users = generateMockUsers(validatedQuery.limit);
        nextCursor = 'mock_cursor'; // Indicate mock data, no real pagination
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    return NextResponse.json({
      users,
      pagination: {
        limit: validatedQuery.limit,
        hasMore: !!nextCursor,
        nextCursor,
      },
      filters: {
        role: validatedQuery.role,
        status: validatedQuery.status,
        q: validatedQuery.q,
      },
      isMockData: nextCursor === 'mock_cursor' // Indicate if mock data is used
    });
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 