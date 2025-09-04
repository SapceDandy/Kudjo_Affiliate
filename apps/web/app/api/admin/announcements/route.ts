import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const AnnouncementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['info', 'warning', 'success', 'urgent']),
  audience: z.enum(['all', 'businesses', 'influencers']),
  priority: z.enum(['low', 'medium', 'high']),
  active: z.boolean(),
  expiresAt: z.string().nullable().optional()
});

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const announcementsSnapshot = await adminDb
      .collection('announcements')
      .orderBy('createdAt', 'desc')
      .get();

    const announcements = announcementsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        content: data.content,
        type: data.type,
        audience: data.audience,
        priority: data.priority,
        active: data.active,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
        viewCount: data.viewCount || 0
      };
    });

    return NextResponse.json({
      success: true,
      announcements
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({
      error: 'Failed to fetch announcements'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type, audience, priority, active, expiresAt } = AnnouncementSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const now = new Date();
    const announcementRef = adminDb!.collection('announcements').doc();

    await announcementRef.set({
      title,
      content,
      type,
      audience,
      priority,
      active,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      viewCount: 0,
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json({
      success: true,
      id: announcementRef.id
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create announcement'
    }, { status: 500 });
  }
}
