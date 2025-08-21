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
				let query = adminDb.collection('users').orderBy(adminDb.collection('users').doc().id ? '__name__' : '__name__');
				// Using document ID ordering for a consistent cursor without relying on createdAt type
				query = adminDb.collection('users').orderBy('__name__');
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