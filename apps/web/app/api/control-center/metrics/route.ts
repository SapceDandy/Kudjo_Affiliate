import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MetricsData {
  totalUsers: number;
  totalBusinesses: number;
  totalInfluencers: number;
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenueCents: number;
  generatedAt: string;
  isMockData: boolean;
}

const metricsCache: {
  data: MetricsData | null;
  timestamp: number;
  expiryMs: number;
} = {
  data: null,
  timestamp: 0,
  expiryMs: 5 * 60 * 1000, // 5 minutes
};

export async function GET(request: Request) {
  try {
    // Check for force refresh param
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    // Check if we have cached data that's not expired
    const now = Date.now();
    if (!forceRefresh && metricsCache.data && (now - metricsCache.timestamp) < metricsCache.expiryMs) {
      return NextResponse.json({
        ...metricsCache.data,
        fromCache: true,
      });
    }

    try {
      // Get real metrics from Firestore
      const [
        businessesSnapshot,
        influencersSnapshot,
        couponsSnapshot,
        redemptionsSnapshot
      ] = await Promise.all([
        adminDb.collection('businesses').get(),
        adminDb.collection('influencers').get(),
        adminDb.collection('coupons').get(),
        adminDb.collection('redemptions').get()
      ]);

      // Calculate active coupons
      const activeCoupons = couponsSnapshot.docs.filter((doc: QueryDocumentSnapshot) => 
        doc.data().status === 'active'
      ).length;

      // Calculate total revenue
      let totalRevenueCents = 0;
      redemptionsSnapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        totalRevenueCents += data.orderValueCents || 0;
      });

      const metrics: MetricsData = {
        totalUsers: businessesSnapshot.size + influencersSnapshot.size,
        totalBusinesses: businessesSnapshot.size,
        totalInfluencers: influencersSnapshot.size,
        totalCoupons: couponsSnapshot.size,
        activeCoupons,
        totalRedemptions: redemptionsSnapshot.size,
        totalRevenueCents,
        generatedAt: new Date().toISOString(),
        isMockData: false
      };

      // Cache the metrics
      metricsCache.data = metrics;
      metricsCache.timestamp = now;

      return NextResponse.json(metrics);

    } catch (firestoreError) {
      console.error('Error fetching from Firestore, returning mock data:', firestoreError);
      
      // Fallback to mock data
      const mockMetrics: MetricsData = {
        totalUsers: 405,
        totalBusinesses: 200,
        totalInfluencers: 200,
        totalCoupons: 359,
        activeCoupons: 359,
        totalRedemptions: 888,
        totalRevenueCents: 4065909,
        generatedAt: new Date().toISOString(),
        isMockData: true
      };

      metricsCache.data = mockMetrics;
      metricsCache.timestamp = now;
      
      return NextResponse.json(mockMetrics);
    }
    
  } catch (error) {
    console.error('Error in metrics API:', error);
    
    // Return mock data as final fallback
    const mockMetrics: MetricsData = {
      totalUsers: 405,
      totalBusinesses: 200,
      totalInfluencers: 200,
      totalCoupons: 359,
      activeCoupons: 359,
      totalRedemptions: 888,
      totalRevenueCents: 4065909,
      generatedAt: new Date().toISOString(),
      isMockData: true
    };
    
    return NextResponse.json(mockMetrics);
  }
} 