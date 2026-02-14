import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  role: z.enum(['admin', 'business', 'influencer']).optional(),
  status: z.string().optional(),
  q: z.string().optional(),
});

type ListUser = {
  id: string;
  email: string | null;
  displayName: string;
  role: string;
  status: string;
  createdAt: string | null;
  photoURL?: string | null;
  handle?: string | null;
  followers?: number | null;
  businessName?: string | null;
  industry?: string | null;
};

function normalizeIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v?.toDate === 'function') return v.toDate().toISOString();
  return null;
}

export async function handleControlCenterUsersList(req: Request, res: Response): Promise<void> {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
    return;
  }

  const { limit, cursor, role, status, q } = parsed.data;

  const db = admin.firestore();

  let query: FirebaseFirestore.Query = db.collection('users').orderBy('__name__');
  if (role) query = query.where('role', '==', role);
  if (status) query = query.where('status', '==', status);
  if (cursor) query = query.startAfter(cursor);

  // Fetch more than limit when q filtering is used so we can post-filter.
  const fetchLimit = q ? Math.min(200, limit * 5) : limit + 1;
  query = query.limit(fetchLimit);

  const snapshot = await query.get();
  const docs = snapshot.docs;

  let items: ListUser[] = docs.map((doc) => {
    const d: any = doc.data();
    return {
      id: doc.id,
      email: d?.email || null,
      displayName: d?.displayName || d?.name || d?.email || doc.id,
      role: d?.role || 'business',
      status: d?.status || 'active',
      createdAt: normalizeIso(d?.createdAt),
      photoURL: d?.photoURL || null,
    };
  });

  if (q && q.trim()) {
    const term = q.toLowerCase().trim();
    items = items.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const name = (u.displayName || '').toLowerCase();
      return email.includes(term) || name.includes(term);
    });
  }

  // Enrich role-specific fields (best-effort, no hard failure).
  const influencerIds = items.filter((u) => u.role === 'influencer').map((u) => u.id);
  const businessIds = items.filter((u) => u.role === 'business').map((u) => u.id);

  if (influencerIds.length > 0) {
    const refs = influencerIds.map((id) => db.collection('influencers').doc(id));
    const snaps = await db.getAll(...refs);
    const byId = new Map<string, any>();
    snaps.forEach((s) => byId.set(s.id, s.exists ? s.data() : null));
    items = items.map((u) => {
      if (u.role !== 'influencer') return u;
      const d: any = byId.get(u.id);
      return {
        ...u,
        handle: d?.handle || d?.username || null,
        followers: typeof d?.followers === 'number' ? d.followers : null,
      };
    });
  }

  if (businessIds.length > 0) {
    const refs = businessIds.map((id) => db.collection('businesses').doc(id));
    const snaps = await db.getAll(...refs);
    const byId = new Map<string, any>();
    snaps.forEach((s) => byId.set(s.id, s.exists ? s.data() : null));
    items = items.map((u) => {
      if (u.role !== 'business') return u;
      const d: any = byId.get(u.id);
      return {
        ...u,
        businessName: d?.name || d?.businessName || null,
        industry: d?.industry || null,
      };
    });
  }

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id || null : null;

  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).json({ items: pageItems, users: pageItems, nextCursor, hasMore });
}
