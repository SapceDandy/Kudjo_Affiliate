import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firebaseCache } from '@/lib/firebase-cache';
import { safeFirestoreQuery } from '@/lib/quota-manager';
import { shouldUseMockData, mockInfluencers, paginateMockData } from '@/lib/mock-data';

import { InfluencerReviewSchema, BulkInfluencerActionSchema } from '@/lib/schemas/admin';
import { z } from 'zod';

// Admin authentication check
async function isAdmin(request: NextRequest): Promise<boolean> {
  const adminPasscode = process.env.ADMIN_PASSCODE;
  const authHeader = request.headers.get('authorization');
  
  if (!adminPasscode || !authHeader) {
    return false;
  }
  
  return authHeader === `Bearer ${adminPasscode}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Use mock data if quota exceeded or in development
    if (shouldUseMockData()) {
      const filteredInfluencers = status === 'all' 
        ? mockInfluencers 
        : mockInfluencers.filter(inf => inf.status.toLowerCase() === status.toLowerCase());
      
      const result = paginateMockData(filteredInfluencers, page, limit);
      
      return NextResponse.json({
        success: true,
        influencers: result.data.map(inf => ({
          id: inf.id,
          name: inf.name,
          email: inf.email,
          tier: inf.tier.toLowerCase(),
          status: inf.status.toLowerCase(),
          socialMedia: {
            instagram: { handle: inf.name.toLowerCase().replace(' ', '_'), followers: inf.followers },
            tiktok: { handle: inf.name.toLowerCase().replace(' ', '_'), followers: Math.floor(inf.followers * 0.8) }
          },
          submittedAt: inf.joinedAt.toISOString(),
          reviewedAt: inf.status !== 'PENDING' ? new Date().toISOString() : undefined,
          reviewedBy: inf.status !== 'PENDING' ? 'admin' : undefined,
          reviewNotes: inf.status !== 'PENDING' ? 'Reviewed via mock data' : undefined
        })),
        hasMore: result.pagination.hasNext,
        stats: {
          totalInfluencers: mockInfluencers.length,
          pendingReviews: mockInfluencers.filter(inf => inf.status === 'PENDING').length,
          approvedToday: 2,
          rejectedToday: 1,
          averageReviewTime: 24
        },
        pagination: {
          page,
          limit,
          total: filteredInfluencers.length
        },
        source: 'mock'
      });
    }

    // Query influencers based on status with limit to avoid quota
    let query = adminDb.collection('influencers').limit(20);
    
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit + 1)
      .get();

    const hasMore = snapshot.docs.length > limit;
    const influencers = snapshot.docs.slice(0, limit).map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown',
        email: data.email || '',
        tier: data.tier || 'bronze',
        status: data.status || 'pending',
        socialMedia: data.socialMedia || {},
        submittedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
        reviewedBy: data.reviewedBy,
        reviewNotes: data.reviewNotes,
      };
    });

    // Get admin stats
    const statsPromises = [
      adminDb.collection('influencers').limit(10).get(),
      adminDb.collection('influencers').where('status', '==', 'pending').limit(10).get(),
      adminDb.collection('influencers')
        .where('status', '==', 'approved')
        .where('reviewedAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .limit(10).get(),
      adminDb.collection('influencers')
        .where('status', '==', 'rejected')
        .where('reviewedAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .limit(10).get(),
    ];

    const [totalSnapshot, pendingSnapshot, approvedTodaySnapshot, rejectedTodaySnapshot] = await Promise.all(statsPromises);

    const stats = {
      totalInfluencers: totalSnapshot.size,
      pendingReviews: pendingSnapshot.size,
      approvedToday: approvedTodaySnapshot.size,
      rejectedToday: rejectedTodaySnapshot.size,
      averageReviewTime: 24, // Mock average review time
    };

    return NextResponse.json({
      success: true,
      influencers,
      hasMore,
      stats,
      pagination: {
        page,
        limit,
        total: stats.totalInfluencers,
      },
    });

  } catch (error: any) {
    console.error('Admin review queue error:', error);
    
    // Handle quota exceeded errors with mock data fallback
    if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
      console.log('Quota exceeded, falling back to mock data');
      
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') || 'pending';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      
      const filteredInfluencers = status === 'all' 
        ? mockInfluencers 
        : mockInfluencers.filter(inf => inf.status.toLowerCase() === status.toLowerCase());
      
      const result = paginateMockData(filteredInfluencers, page, limit);
      
      return NextResponse.json({
        success: true,
        influencers: result.data.map(inf => ({
          id: inf.id,
          name: inf.name,
          email: inf.email,
          tier: inf.tier.toLowerCase(),
          status: inf.status.toLowerCase(),
          socialMedia: {
            instagram: { handle: inf.name.toLowerCase().replace(' ', '_'), followers: inf.followers },
            tiktok: { handle: inf.name.toLowerCase().replace(' ', '_'), followers: Math.floor(inf.followers * 0.8) }
          },
          submittedAt: inf.joinedAt.toISOString(),
          reviewedAt: inf.status !== 'PENDING' ? new Date().toISOString() : undefined,
          reviewedBy: inf.status !== 'PENDING' ? 'admin' : undefined,
          reviewNotes: inf.status !== 'PENDING' ? 'Reviewed via mock data fallback' : undefined
        })),
        hasMore: result.pagination.hasNext,
        stats: {
          totalInfluencers: mockInfluencers.length,
          pendingReviews: mockInfluencers.filter(inf => inf.status === 'PENDING').length,
          approvedToday: 2,
          rejectedToday: 1,
          averageReviewTime: 24
        },
        pagination: {
          page,
          limit,
          total: filteredInfluencers.length
        },
        source: 'mock_fallback'
      });
    }
    
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch review queue' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { influencerIds, action, reason, notes } = BulkInfluencerActionSchema.parse(body);

    const batch = adminDb.batch();
    const now = new Date();
    const adminId = 'admin'; // In real implementation, get from auth

    // Update each influencer
    for (const influencerId of influencerIds) {
      const influencerRef = adminDb.collection('influencers').doc(influencerId);
      
      batch.update(influencerRef, {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'info_requested',
        reviewedAt: now,
        reviewedBy: adminId,
        reviewNotes: notes || reason || '',
        updatedAt: now,
      });

      // Log the review action
      const reviewLogRef = adminDb.collection('influencerReviews').doc();
      batch.set(reviewLogRef, {
        influencerId,
        action,
        reason: reason || '',
        notes: notes || '',
        reviewedBy: adminId,
        reviewedAt: now,
        createdAt: now,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}d ${influencerIds.length} influencer${influencerIds.length === 1 ? '' : 's'}`,
      processedCount: influencerIds.length,
    });

  } catch (error) {
    console.error('Bulk influencer action error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process influencer actions' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { influencerId, action, reason, notes } = InfluencerReviewSchema.parse(body);

    const influencerRef = adminDb.collection('influencers').doc(influencerId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      return NextResponse.json(
        { error: { code: 'INFLUENCER_NOT_FOUND', message: 'Influencer not found' } },
        { status: 404 }
      );
    }

    const now = new Date();
    const adminId = 'admin'; // In real implementation, get from auth

    // Update influencer status
    await influencerRef.update({
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'info_requested',
      reviewedAt: now,
      reviewedBy: adminId,
      reviewNotes: notes || reason || '',
      updatedAt: now,
    });

    // Log the review action
    await adminDb.collection('influencerReviews').add({
      influencerId,
      action,
      reason: reason || '',
      notes: notes || '',
      reviewedBy: adminId,
      reviewedAt: now,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: `Influencer ${action}d successfully`,
      influencerId,
      action,
    });

  } catch (error) {
    console.error('Individual influencer review error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to review influencer' } },
      { status: 500 }
    );
  }
}
