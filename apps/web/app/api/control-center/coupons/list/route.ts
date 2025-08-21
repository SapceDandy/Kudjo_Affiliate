import { NextResponse } from 'next/server';
import { adminDb, generateMockCoupons } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function enrichCouponNames(coupons: any[]) {
	if (!adminDb) return coupons.map(normalizeCoupon);
	try {
		const uniqueBizIds = Array.from(new Set(coupons.map(c => c.bizId).filter(Boolean)));
		const uniqueInfIds = Array.from(new Set(coupons.map(c => c.infId).filter(Boolean)));

		const bizSnapshots = await Promise.all(uniqueBizIds.map(id => adminDb.collection('businesses').doc(id).get()));
		const infSnapshots = await Promise.all(uniqueInfIds.map(id => adminDb.collection('users').doc(id).get()));

		const bizIdToName: Record<string, string> = {};
		bizSnapshots.forEach(s => { if (s.exists) bizIdToName[s.id] = s.data()?.name || s.data()?.displayName || s.data()?.title || s.id; });

		const infIdToName: Record<string, string> = {};
		infSnapshots.forEach(s => { if (s.exists) infIdToName[s.id] = s.data()?.displayName || s.data()?.name || s.id; });

		return coupons.map(c => normalizeCoupon({
			...c,
			businessName: c.businessName || (c.bizId && bizIdToName[c.bizId]) || undefined,
			influencerName: c.influencerName || (c.infId && infIdToName[c.infId]) || undefined,
		}));
	} catch (e) {
		console.error('Name enrichment failed, returning normalized coupons only:', e);
		return coupons.map(normalizeCoupon);
	}
}

function normalizeCoupon(raw: any) {
	return {
		id: raw.id,
		code: raw.code || raw.couponCode || raw.id || 'UNKNOWN',
		type: raw.type || raw.couponType || 'AFFILIATE',
		bizId: raw.bizId || raw.businessId || null,
		infId: raw.infId || raw.influencerId || null,
		businessName: raw.businessName || null,
		influencerName: raw.influencerName || null,
		offerId: raw.offerId || null,
		createdAt: raw.createdAt?.toDate?.() || raw.createdAt || new Date().toISOString(),
		used: Boolean(raw.used)
	};
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const limitParam = Number(searchParams.get('limit'));
		const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100 ? limitParam : 20;
		const cursor = searchParams.get('cursor');

		console.log('Coupons list API called with', { limit, cursor });
		try {
			if (adminDb) {
				let query = adminDb.collection('coupons').orderBy('__name__');
				if (cursor) {
					query = query.startAfter(cursor);
				}
				query = query.limit(limit + 1);

				const snapshot = await query.get();
				const docs = snapshot.docs;
				const hasMore = docs.length > limit;
				const pageDocs = hasMore ? docs.slice(0, limit) : docs;
				const rawCoupons = pageDocs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
				const coupons = await enrichCouponNames(rawCoupons);
				const nextCursor = hasMore ? docs[docs.length - 1].id : null;

				console.log(`Fetched ${coupons.length} coupons (hasMore=${hasMore})`);
				return NextResponse.json({ items: coupons, coupons, nextCursor, hasMore });
			} else {
				throw new Error('Admin DB not available');
			}
		} catch (adminError) {
			console.error('Error using Admin SDK, using mock data:', adminError);
			const all = generateMockCoupons(200).map(normalizeCoupon);
			const startIndex = cursor ? Math.max(0, all.findIndex(c => c.id === cursor) + 1) : 0;
			const slice = all.slice(startIndex, startIndex + limit + 1);
			const hasMore = slice.length > limit;
			const items = hasMore ? slice.slice(0, limit) : slice;
			const nextCursor = hasMore ? items[items.length - 1].id : null;
			return NextResponse.json({ items, coupons: items, nextCursor, hasMore });
		}
	} catch (error) {
		console.error('Error fetching coupons:', error);
		return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
	}
} 