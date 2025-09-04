import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Mark all messages in this conversation as read for admin
    const messagesSnapshot = await adminDb
      .collection('messages')
      .where('conversationId', '==', conversationId)
      .where('read', '==', false)
      .get();

    const batch = adminDb!.batch();
    
    messagesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    // Reset admin's unread count for this conversation
    const conversationRef = adminDb!.collection('conversations').doc(conversationId);
    batch.update(conversationRef, {
      'unreadCounts.admin': 0
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      markedAsRead: messagesSnapshot.size
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({
      error: 'Failed to mark messages as read'
    }, { status: 500 });
  }
}
