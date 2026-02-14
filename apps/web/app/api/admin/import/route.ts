import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const ImportRequestSchema = z.object({
  type: z.enum(['redemptions', 'users', 'coupons']),
  data: z.array(z.record(z.any())),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, options } = ImportRequestSchema.parse(body);
  const { skipDuplicates = true, validateOnly = false } = options || {};

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    if (validateOnly) {
      // Validation-only mode
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        try {
          validateRecord(type, record);
          results.processed++;
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      return NextResponse.json({
        validation: true,
        results,
        message: `Validated ${results.processed} records with ${results.errors.length} errors`,
      });
    }

    // Actual import
    const batch = adminDb.batch();
    let batchCount = 0;
    const maxBatchSize = 500;

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      
      try {
        const validatedRecord = validateRecord(type, record);
        
        let docRef;
        let exists = false;

        switch (type) {
          case 'redemptions':
            // Check for duplicates by couponId + timestamp
            const existingRedemption = await adminDb
              .collection('redemptions')
              .where('couponId', '==', (validatedRecord as any).couponId)
              .where('createdAt', '==', (validatedRecord as any).createdAt)
              .limit(1)
              .get();

            if (!existingRedemption.empty && skipDuplicates) {
              results.skipped++;
              continue;
            }

            docRef = adminDb.collection('redemptions').doc();
            batch.set(docRef, {
              ...validatedRecord,
              importedAt: new Date(),
              importSource: 'admin_csv',
            });
            break;

          case 'users':
            // Determine collection based on user type
            const collection = (validatedRecord as any).type === 'influencer' ? 'influencers' : 'businesses';
            docRef = adminDb.collection(collection).doc((validatedRecord as any).id || adminDb.collection(collection).doc().id);
            
            // Check if exists
            const existingUser = await docRef.get();
            exists = existingUser.exists;

            if (exists && skipDuplicates) {
              results.skipped++;
              continue;
            }

            batch.set(docRef, {
              ...validatedRecord,
              [exists ? 'updatedAt' : 'createdAt']: new Date(),
              importedAt: new Date(),
            }, { merge: exists });
            break;

          case 'coupons':
            // Check for duplicates by code
            const existingCoupon = await adminDb
              .collection('coupons')
              .where('code', '==', (validatedRecord as any).code)
              .limit(1)
              .get();

            if (!existingCoupon.empty && skipDuplicates) {
              results.skipped++;
              continue;
            }

            docRef = adminDb.collection('coupons').doc();
            batch.set(docRef, {
              ...validatedRecord,
              importedAt: new Date(),
              importSource: 'admin_csv',
            });
            break;
        }

        if (exists) {
          results.updated++;
        } else {
          results.created++;
        }
        
        results.processed++;
        batchCount++;

        // Commit batch if we hit the limit
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batchCount = 0;
        }

      } catch (error: any) {
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`,
    });

  } catch (error: any) {
    console.error('Import error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid request parameters',
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Import failed',
      details: error.message 
    }, { status: 500 });
  }
}

function validateRecord(type: string, record: any) {
  switch (type) {
    case 'redemptions':
      return z.object({
        couponId: z.string(),
        businessId: z.string(),
        influencerId: z.string(),
        amount: z.number().positive(),
        influencerEarnings: z.number().nonnegative(),
        businessRevenue: z.number().nonnegative(),
        createdAt: z.union([z.date(), z.string().transform(s => new Date(s))]),
        status: z.enum(['completed', 'pending', 'failed']).default('completed'),
      }).parse(record);

    case 'users':
      return z.object({
        id: z.string().optional(),
        type: z.enum(['influencer', 'business']),
        email: z.string().email(),
        name: z.string(),
        status: z.enum(['active', 'pending', 'suspended']).default('active'),
        // Conditional fields based on type
        followers: z.number().optional(),
        tier: z.string().optional(),
        platform: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
      }).parse(record);

    case 'coupons':
      return z.object({
        code: z.string(),
        type: z.enum(['AFFILIATE', 'CONTENT_MEAL']),
        businessId: z.string(),
        influencerId: z.string(),
        offerId: z.string(),
        status: z.enum(['active', 'used', 'expired']).default('active'),
        createdAt: z.union([z.date(), z.string().transform(s => new Date(s))]),
        expiresAt: z.union([z.date(), z.string().transform(s => new Date(s))]).optional(),
      }).parse(record);

    default:
      throw new Error(`Unsupported import type: ${type}`);
  }
}
