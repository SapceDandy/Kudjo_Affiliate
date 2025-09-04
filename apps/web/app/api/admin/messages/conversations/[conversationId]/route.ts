import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get messages for this conversation
    const messagesSnapshot = await adminDb
      .collection('messages')
      .where('conversationId', '==', conversationId)
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        content: data.content,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        read: data.read || false
      };
    });

    return NextResponse.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({
      error: 'Failed to fetch messages'
    }, { status: 500 });
  }
}
