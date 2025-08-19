import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

const ApiCouponUsageRecord = z.object({
  couponId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  uses: z.number().int().nonnegative(),
  revenue_cents: z.number().int().nonnegative().optional(),
});

// Generate coupon stats daily document ID
function makeCouponStatsId(couponId: string, date: string): string {
  const formatted = date.replace(/-/g, ''); // YYYYMMDD
  return `${couponId}_${formatted}`;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = ApiCouponUsageRecord.parse(body);
    const { couponId, date, uses, revenue_cents = 0 } = validatedData;

    // Check if coupon exists
    const couponRef = doc(db, 'coupons', couponId);
    const couponDoc = await getDoc(couponRef);

    if (!couponDoc.exists()) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const couponData = couponDoc.data();

    // Generate stats document ID
    const statsId = makeCouponStatsId(couponId, date);
    const statsRef = doc(db, 'couponStatsDaily', statsId);

    // Check if stats document exists
    const statsDoc = await getDoc(statsRef);
    
    if (statsDoc.exists()) {
      // Update existing stats document (increment values)
      await updateDoc(statsRef, {
        uses: increment(uses),
        revenue_cents: increment(revenue_cents),
        // payouts_cents will be calculated separately based on splits
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new stats document
      const newStats = {
        couponId,
        bizId: couponData.bizId,
        infId: couponData.infId,
        date,
        uses,
        revenue_cents,
        payouts_cents: 0, // Will be calculated based on splits
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(statsRef, newStats);
    }

    // Get updated stats for response
    const updatedStatsDoc = await getDoc(statsRef);
    const updatedStats = updatedStatsDoc.data();

    return NextResponse.json({
      success: true,
      couponId,
      date,
      addedUses: uses,
      addedRevenue: revenue_cents,
      totalStats: {
        uses: updatedStats?.uses || 0,
        revenue_cents: updatedStats?.revenue_cents || 0,
        payouts_cents: updatedStats?.payouts_cents || 0,
      },
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Usage record error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 