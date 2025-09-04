import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['info', 'warning', 'success', 'urgent']).optional(),
  audience: z.enum(['all', 'businesses', 'influencers']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().nullable().optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const updates = UpdateAnnouncementSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const announcementRef = adminDb!.collection('announcements').doc(id);
    const announcementDoc = await announcementRef.get();

    if (!announcementDoc.exists) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const updateData: any = {
      ...updates,
      updatedAt: new Date()
    };

    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
    }

    await announcementRef.update(updateData);

    return NextResponse.json({
      success: true,
      id
    });

  } catch (error) {
    console.error('Error updating announcement:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to update announcement'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const announcementRef = adminDb!.collection('announcements').doc(id);
    const announcementDoc = await announcementRef.get();

    if (!announcementDoc.exists) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await announcementRef.delete();

    return NextResponse.json({
      success: true,
      id
    });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({
      error: 'Failed to delete announcement'
    }, { status: 500 });
  }
}
