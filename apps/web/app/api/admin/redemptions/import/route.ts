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
        const existingRedemption = await adminDb.collection('redemptions')
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

        // Find the coupon
        const couponsQuery = await adminDb.collection('coupons')
          .where('code', '==', couponCode)
          .limit(1)
          .get();

        if (couponsQuery.empty) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Coupon not found`);
          continue;
        }

        const couponDoc = couponsQuery.docs[0];
        const couponData = couponDoc.data();

        // Get offer details for split calculation
        const offerDoc = await adminDb.collection('offers').doc(couponData.offerId).get();
        if (!offerDoc.exists) {
          results.failed++;
          results.errors.push(`Row ${results.processed}: Associated offer not found`);
          continue;
        }

        const offerData = offerDoc.data()!;
        const splitPct = offerData.splitPct || 20;
        const infEarnings = Math.round(amountCents * (splitPct / 100));

        const now = new Date();

        // Create redemption record
        const redemptionData = {
          id: nanoid(),
          couponId: couponDoc.id,
          couponCode,
          couponType: couponData.type,
          bizId: couponData.bizId,
          infId: couponData.infId,
          offerId: couponData.offerId,
          orderValueCents: amountCents,
          infEarnings,
          splitPct,
          timestamp: redemptionTimestamp,
          source: 'csv_import',
          createdAt: now,
          updatedAt: now,
        };

        // Use batch for atomic operations
        const batch = adminDb.batch();

        // Add redemption
        const redemptionRef = adminDb.collection('redemptions').doc();
        batch.set(redemptionRef, redemptionData);

        // Mark coupon as used if not already
        if (couponData.status === 'active') {
          batch.update(couponDoc.ref, {
            status: 'used',
            usedAt: redemptionTimestamp,
            updatedAt: now,
          });
        }

        // Update affiliate link if it's an affiliate coupon
        if (couponData.type === 'AFFILIATE' && couponData.linkId) {
          const linkRef = adminDb.collection('affiliateLinks').doc(couponData.linkId);
          batch.update(linkRef, {
            conversions: adminDb.FieldValue.increment(1),
            updatedAt: now,
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
