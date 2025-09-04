import { NextResponse } from 'next/server';
import { adminDb, generateMockUsers } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeUser(raw: any) {
	return {
		id: raw.id,
		email: raw.email || raw.userEmail || 'unknown@example.com',
		displayName: raw.displayName || raw.name || raw.username || raw.email || 'Unnamed User',
		role: raw.role || raw.userRole || 'business',
		photoURL: raw.photoURL || raw.avatarUrl || null,
		status: raw.status || 'active',
		createdAt: raw.createdAt?.toDate?.() || raw.createdAt || new Date().toISOString(),
	};
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const limitParam = Number(searchParams.get('limit'));
		const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100 ? limitParam : 20;
		const cursor = searchParams.get('cursor'); // document id to startAfter

		console.log('Users API called with', { limit, cursor });

		try {
			if (adminDb) {
				let query = adminDb!.collection('users').orderBy(adminDb!.collection('users').doc().id ? '__name__' : '__name__');
				// Using document ID ordering for a consistent cursor without relying on createdAt type
				query = adminDb!.collection('users').orderBy('__name__');
				if (cursor) {
					query = query.startAfter(cursor);
				}
				query = query.limit(limit + 1); // fetch one extra to compute hasMore

				const snapshot = await query.get();
				const docs = snapshot.docs;
				const hasMore = docs.length > limit;
				const pageDocs = hasMore ? docs.slice(0, limit) : docs;
				const items = pageDocs.map((doc: any) => normalizeUser({ id: doc.id, ...doc.data() }));
				const nextCursor = hasMore ? docs[docs.length - 1].id : null;

				console.log(`Fetched ${items.length} users (hasMore=${hasMore})`);
				return NextResponse.json({ items, users: items, nextCursor, hasMore });
			} else {
				throw new Error('Admin DB not available');
			}
		} catch (adminError) {
			console.error('Error using Admin SDK, using mock data:', adminError);
			const all = generateMockUsers(150).map(normalizeUser);
			// Simple cursor over array using id suffix number when present
			const startIndex = cursor ? Math.max(0, all.findIndex(u => u.id === cursor) + 1) : 0;
			const slice = all.slice(startIndex, startIndex + limit + 1);
			const hasMore = slice.length > limit;
			const items = hasMore ? slice.slice(0, limit) : slice;
			const nextCursor = hasMore ? items[items.length - 1].id : null;
			return NextResponse.json({ items, users: items, nextCursor, hasMore });
		}
	} catch (error) {
		console.error('Error fetching users:', error);
		return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		if (!adminDb) {
			return NextResponse.json({ error: 'Admin DB not available' }, { status: 500 });
		}

		// Create mock business owner and business defaults
		const businessUserId = 'demo_business_user';
		const influencerUserId = 'demo_influencer_user';
		const businessId = businessUserId; // using uid as doc id
		const influencerId = influencerUserId; // using uid as doc id
		
		// Demo account credentials
		const businessEmail = 'demo.business@example.com';
		const influencerEmail = 'demo.influencer@example.com';
		const demoPassword = 'demo123';

		// Create Firebase Auth users if they don't exist
		try {
			const admin = require('firebase-admin');
			const auth = admin.auth();
			
			// Try to create business user
			try {
				await auth.createUser({
					uid: businessUserId,
					email: businessEmail,
					password: demoPassword,
					displayName: 'Demo Business',
				});
				console.log('Created business auth user');
			} catch (e: any) {
				// Ignore if user already exists
				if (e.code !== 'auth/uid-already-exists' && e.code !== 'auth/email-already-exists') {
					console.error('Error creating business auth user:', e);
				} else {
					console.log('Business auth user already exists');
				}
			}
			
			// Try to create influencer user
			try {
				await auth.createUser({
					uid: influencerUserId,
					email: influencerEmail,
					password: demoPassword,
					displayName: 'Demo Influencer',
				});
				console.log('Created influencer auth user');
			} catch (e: any) {
				// Ignore if user already exists
				if (e.code !== 'auth/uid-already-exists' && e.code !== 'auth/email-already-exists') {
					console.error('Error creating influencer auth user:', e);
				} else {
					console.log('Influencer auth user already exists');
				}
			}
		} catch (authError) {
			console.error('Error creating auth users:', authError);
			// Continue anyway to create the Firestore docs
		}

		// Create Firestore documents
		await adminDb!.collection('users').doc(businessUserId).set({
			id: businessUserId,
			email: businessEmail,
			role: 'business',
			status: 'active',
			createdAt: new Date().toISOString(),
		});
		await adminDb!.collection('businesses').doc(businessId).set({
			id: businessId,
			ownerId: businessUserId,
			name: 'Demo Bistro',
			address: '123 Demo St, Hometown',
			geo: { lat: 37.7749, lng: -122.4194 },
			couponSettings: {
				defaultDiscountPct: 20,
				tierSplits: { Bronze: 10, Silver: 15, Gold: 20, Platinum: 25 },
				maxActiveInfluencers: 5,
				couponLimit: 100,
			},
			defaultSplitPct: 20,
			status: 'active',
			createdAt: new Date().toISOString(),
		});

		// Create mock influencer
		await adminDb!.collection('users').doc(influencerUserId).set({
			id: influencerUserId,
			email: influencerEmail,
			role: 'influencer',
			status: 'active',
			createdAt: new Date().toISOString(),
		});
		await adminDb!.collection('influencers').doc(influencerId).set({
			id: influencerId,
			ownerId: influencerUserId,
			handle: '@demo_influencer',
			followers: 15000,
			tier: 'Silver',
			status: 'active',
			createdAt: new Date().toISOString(),
		});

		// Create one demo offer for the business
		await adminDb!.collection('offers').doc('demo_offer').set({
			id: 'demo_offer',
			bizId: businessId,
			title: '20% Off Any Entree',
			description: 'Enjoy 20% off your meal at Demo Bistro',
			splitPct: 20,
			active: true,
			status: 'active',
			createdAt: new Date().toISOString(),
		});

		return NextResponse.json({ 
			success: true, 
			businessUserId, 
			influencerUserId, 
			businessId, 
			influencerId,
			credentials: {
				businessEmail,
				influencerEmail,
				password: demoPassword
			}
		});
	} catch (error) {
		console.error('Error creating demo users:', error);
		return NextResponse.json({ error: 'Failed to create demo users' }, { status: 500 });
	}
} 