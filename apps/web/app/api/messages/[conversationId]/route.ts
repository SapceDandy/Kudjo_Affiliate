import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = params;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Get messages for this conversation
    const messagesQuery = adminDb!.collection('messages')
      .where('conversationId', '==', conversationId)
      .orderBy('timestamp', 'asc');

    const messagesSnapshot = await messagesQuery.get();
    
    const messages = messagesSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        senderId: data.senderId,
        senderType: data.senderType,
        senderName: data.senderName,
        content: data.content,
        timestamp: data.timestamp?.toDate(),
        read: data.read
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch messages', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
