import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, senderId, senderType, senderName, content } = body;

    if (!conversationId || !senderId || !senderType || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const messageData = {
      conversationId,
      senderId,
      senderType,
      senderName,
      content,
      timestamp: new Date(),
      read: false
    };

    const docRef = await adminDb.collection('messages').add(messageData);

    // Update conversation with last message
    await adminDb.collection('conversations').doc(conversationId).update({
      lastMessage: messageData,
      lastMessageAt: new Date(),
      [`unreadCount_${senderType === 'business' ? 'influencer' : 'business'}`]: adminDb.FieldValue.increment(1)
    });

    return NextResponse.json({ success: true, messageId: docRef.id });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ 
      error: 'Failed to create message', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
