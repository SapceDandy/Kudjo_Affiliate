import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';

interface CSVRow {
  timestamp: string;
  amount: string;
  couponCode: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvData } = body;

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json({ error: 'Invalid CSV data' }, { status: 400 });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each row
    for (const row of csvData) {
      results.processed++;
      
      try {
        const { timestamp, amount, couponCode } = row as CSVRow;
        
        if (!timestamp || !amount || !couponCode) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Missing required fields`);
          continue;
        }

        const amountCents = Math.round(parseFloat(amount) * 100);
        const redemptionTimestamp = new Date(timestamp);

        if (isNaN(amountCents) || amountCents <= 0) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Invalid amount`);
          continue;
        }

        if (isNaN(redemptionTimestamp.getTime())) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Invalid timestamp`);
          continue;
        }

        // Check for duplicate redemption (idempotent)
        const existingRedemption = await adminDb!.collection('redemptions')
          .where('couponCode', '==', couponCode)
          .where('timestamp', '==', redemptionTimestamp)
          .where('orderValueCents', '==', amountCents)
          .limit(1)
          .get();

        if (!existingRedemption.empty) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Duplicate redemption`);
          continue;
        }

        // Find the coupon to get business info
        const couponDoc = await adminDb!.collection('coupons')
          .where('code', '==', couponCode)
          .limit(1)
          .get();

        if (couponDoc.empty) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Coupon not found`);
          continue;
        }

        const couponData = couponDoc.docs[0].data();
        const couponId = couponDoc.docs[0].id;

        // Find affiliate link for earnings calculation
        const affiliateLinkDoc = await adminDb!.collection('affiliateLinks')
          .where('couponId', '==', couponId)
          .limit(1)
          .get();

        if (affiliateLinkDoc.empty) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Affiliate link not found`);
          continue;
        }

        const affiliateLinkData = affiliateLinkDoc.docs[0].data();
        const affiliateLinkId = affiliateLinkDoc.docs[0].id;

        // Calculate earnings
        const splitPct = affiliateLinkData.splitPct || 0;
        const earningsCents = Math.round(amountCents * (splitPct / 100));

        const now = new Date();

        // Create redemption record
        const redemptionRef = adminDb!.collection('redemptions').doc();
        const batch = adminDb!.batch();
        batch.set(redemptionRef, {
          id: nanoid(),
          couponId,
          couponCode,
          affiliateLinkId,
          businessId: couponData.businessId,
          influencerId: couponData.influencerId,
          orderValueCents: amountCents,
          earningsCents,
          timestamp: redemptionTimestamp,
          source: 'csv_import',
          createdAt: now,
          updatedAt: now,
        });

        // Update affiliate link stats
        const affiliateLinkRef = adminDb!.collection('affiliateLinks').doc(affiliateLinkId);
        batch.update(affiliateLinkRef, {
          conversions: (affiliateLinkData.conversions || 0) + 1,
          totalRedemptions: (affiliateLinkData.totalRedemptions || 0) + 1,
          totalEarnings: (affiliateLinkData.totalEarnings || 0) + earningsCents,
          updatedAt: now,
        });

        // Mark coupon as used if not already
        if (couponData.status === 'active') {
          batch.update(couponDoc.docs[0].ref, {
            status: 'used',
            usedAt: redemptionTimestamp,
            updatedAt: now,
          });
        }

        // Update affiliate link if it's an affiliate coupon
        if (couponData.type === 'AFFILIATE' && couponData.linkId) {
          const linkRef = adminDb!.collection('affiliateLinks').doc(couponData.linkId);
          batch.update(linkRef, {
            conversions: (affiliateLinkData.conversions || 0) + 1,
            totalEarnings: (affiliateLinkData.totalEarnings || 0) + earningsCents,
            updatedAt: now
          });
        }

        await batch.commit();
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${results.processed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('Error importing CSV redemptions:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
