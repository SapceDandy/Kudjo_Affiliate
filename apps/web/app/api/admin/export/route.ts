import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const ExportRequestSchema = z.object({
  type: z.enum(['users', 'businesses', 'influencers', 'redemptions', 'coupons', 'metrics']),
  format: z.enum(['csv', 'json']).default('csv'),
  filters: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.string().optional(),
    businessId: z.string().optional(),
    influencerId: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, format, filters } = ExportRequestSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    let data: any[] = [];
    let filename = `${type}_export_${new Date().toISOString().split('T')[0]}`;

    switch (type) {
      case 'users':
        // Export both influencers and businesses
        const [influencersSnap, businessesSnap] = await Promise.all([
          adminDb.collection('influencers').get(),
          adminDb.collection('businesses').get(),
        ]);

        data = [
          ...influencersSnap.docs.map((doc: any) => ({
            id: doc.id,
            type: 'influencer',
            email: doc.data().email,
            name: doc.data().name,
            status: doc.data().status,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
            followers: doc.data().followers,
            tier: doc.data().tier,
            platform: doc.data().platform,
          })),
          ...businessesSnap.docs.map((doc: any) => ({
            id: doc.id,
            type: 'business',
            email: doc.data().email,
            name: doc.data().name,
            status: doc.data().status,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
            industry: doc.data().industry,
            location: doc.data().location,
          })),
        ];
        break;

      case 'businesses':
        const businessSnap = await adminDb.collection('businesses').get();
        data = businessSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        }));
        break;

      case 'influencers':
        const influencerSnap = await adminDb.collection('influencers').get();
        data = influencerSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        }));
        break;

      case 'redemptions':
        let redemptionsQuery: any = adminDb.collection('redemptions');
        
        if (filters?.dateFrom) {
          redemptionsQuery = redemptionsQuery.where('createdAt', '>=', new Date(filters.dateFrom));
        }
        if (filters?.dateTo) {
          redemptionsQuery = redemptionsQuery.where('createdAt', '<=', new Date(filters.dateTo));
        }
        if (filters?.businessId) {
          redemptionsQuery = redemptionsQuery.where('businessId', '==', filters.businessId);
        }
        if (filters?.influencerId) {
          redemptionsQuery = redemptionsQuery.where('influencerId', '==', filters.influencerId);
        }

        const redemptionsSnap = await redemptionsQuery.get();
        data = redemptionsSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        }));
        break;

      case 'coupons':
        const couponsSnap = await adminDb.collection('coupons').get();
        data = couponsSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
          expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString(),
        }));
        break;

      case 'metrics':
        // Export aggregated metrics
        const [
          totalBusinesses,
          totalInfluencers,
          totalCoupons,
          totalRedemptions,
        ] = await Promise.all([
          adminDb.collection('businesses').get().then(snap => snap.size),
          adminDb.collection('influencers').get().then(snap => snap.size),
          adminDb.collection('coupons').get().then(snap => snap.size),
          adminDb.collection('redemptions').get().then(snap => snap.size),
        ]);

        data = [{
          exportedAt: new Date().toISOString(),
          totalBusinesses,
          totalInfluencers,
          totalCoupons,
          totalRedemptions,
          totalUsers: totalBusinesses + totalInfluencers,
        }];
        break;

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 404 });
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
          }).join(',')
        )
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // Return JSON
      return NextResponse.json({
        data,
        exportedAt: new Date().toISOString(),
        totalRecords: data.length,
        type,
        filters,
      });
    }

  } catch (error: any) {
    console.error('Export error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid request parameters',
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Export failed',
      details: error.message 
    }, { status: 500 });
  }
}
