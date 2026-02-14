import { Request, Response } from 'express';
import admin from 'firebase-admin';

function escapeCsvValue(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function handleControlCenterExportRedemptionsCsv(_req: Request, res: Response): Promise<void> {
  const db = admin.firestore();
  const snap = await db.collection('redemptions').orderBy('redeemedAt', 'desc').limit(5000).get();

  const rows = snap.docs.map((doc) => {
    const d: any = doc.data();
    return {
      id: doc.id,
      businessId: d?.businessId || d?.bizId || '',
      influencerId: d?.influencerId || d?.infId || '',
      couponId: d?.couponId || '',
      status: d?.status || '',
      orderValueCents: d?.orderValueCents || 0,
      redeemedAt: d?.redeemedAt?.toDate?.()?.toISOString?.() || d?.redeemedAt || '',
      createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || d?.createdAt || '',
    };
  });

  const headers = rows[0] ? Object.keys(rows[0]) : ['id'];
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCsvValue((r as any)[h])).join(',')),
  ].join('\n');

  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="redemptions.csv"');
  res.set('Cache-Control', 'private, max-age=30');
  res.status(200).send(csv);
}
