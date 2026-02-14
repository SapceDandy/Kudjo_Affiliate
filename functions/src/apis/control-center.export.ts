import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { z } from 'zod';

const BodySchema = z.object({
  type: z.enum(['users', 'businesses', 'influencers', 'redemptions', 'coupons', 'metrics']),
  format: z.enum(['csv', 'json']).default('csv'),
  filters: z
    .object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.string().optional(),
      businessId: z.string().optional(),
      influencerId: z.string().optional(),
    })
    .optional(),
});

function escapeCsvValue(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[\",\n]/.test(s)) return `\"${s.replace(/\"/g, '\"\"')}\"`;
  return s;
}

export async function handleControlCenterExport(req: Request, res: Response): Promise<void> {
  const body = BodySchema.parse(req.body);
  const db = admin.firestore();

  let data: any[] = [];
  let filename = `${body.type}_export_${new Date().toISOString().split('T')[0]}`;

  switch (body.type) {
    case 'users': {
      const [influencersSnap, businessesSnap] = await Promise.all([
        db.collection('influencers').get(),
        db.collection('businesses').get(),
      ]);
      data = [
        ...influencersSnap.docs.map((doc) => {
          const d: any = doc.data();
          return {
            id: doc.id,
            type: 'influencer',
            email: d?.email || '',
            name: d?.name || d?.displayName || '',
            status: d?.status || '',
            createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || d?.createdAt || '',
            followers: d?.followers || '',
            tier: d?.tier || '',
            platform: d?.platform || '',
          };
        }),
        ...businessesSnap.docs.map((doc) => {
          const d: any = doc.data();
          return {
            id: doc.id,
            type: 'business',
            email: d?.email || '',
            name: d?.name || d?.businessName || '',
            status: d?.status || '',
            createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || d?.createdAt || '',
            industry: d?.industry || '',
            location: d?.location || '',
          };
        }),
      ];
      break;
    }

    case 'businesses': {
      const snap = await db.collection('businesses').get();
      data = snap.docs.map((doc) => {
        const d: any = doc.data();
        return { id: doc.id, ...d, createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || d?.createdAt || '' };
      });
      break;
    }

    case 'influencers': {
      const snap = await db.collection('influencers').get();
      data = snap.docs.map((doc) => {
        const d: any = doc.data();
        return { id: doc.id, ...d, createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || d?.createdAt || '' };
      });
      break;
    }

    case 'redemptions': {
      let q: FirebaseFirestore.Query = db.collection('redemptions');
      if (body.filters?.dateFrom) q = q.where('createdAt', '>=', new Date(body.filters.dateFrom));
      if (body.filters?.dateTo) q = q.where('createdAt', '<=', new Date(body.filters.dateTo));
      if (body.filters?.businessId) q = q.where('businessId', '==', body.filters.businessId);
      if (body.filters?.influencerId) q = q.where('influencerId', '==', body.filters.influencerId);

      const snap = await q.get();
      data = snap.docs.map((doc) => {
        const d: any = doc.data();
        return { id: doc.id, ...d, createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || d?.createdAt || '' };
      });
      break;
    }

    case 'coupons': {
      const snap = await db.collection('coupons').get();
      data = snap.docs.map((doc) => {
        const d: any = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || d?.createdAt || '',
          expiresAt: d?.expiresAt?.toDate?.()?.toISOString?.() || d?.expiresAt || '',
        };
      });
      break;
    }

    case 'metrics': {
      const [totalBusinesses, totalInfluencers, totalCoupons, totalRedemptions] = await Promise.all([
        db.collection('businesses').get().then((s) => s.size),
        db.collection('influencers').get().then((s) => s.size),
        db.collection('coupons').get().then((s) => s.size),
        db.collection('redemptions').get().then((s) => s.size),
      ]);

      data = [
        {
          exportedAt: new Date().toISOString(),
          totalBusinesses,
          totalInfluencers,
          totalCoupons,
          totalRedemptions,
          totalUsers: totalBusinesses + totalInfluencers,
        },
      ];
      break;
    }
  }

  res.set('Cache-Control', 'private, max-age=30');

  if (body.format === 'csv') {
    if (data.length === 0) {
      res.status(404).json({ error: 'no_data' });
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => escapeCsvValue((row as any)[h])).join(',')),
    ].join('\n');

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.status(200).send(csv);
    return;
  }

  res.status(200).json({
    data,
    exportedAt: new Date().toISOString(),
    totalRecords: data.length,
    type: body.type,
    filters: body.filters,
  });
}
