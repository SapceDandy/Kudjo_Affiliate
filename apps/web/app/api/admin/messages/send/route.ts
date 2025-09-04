import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const SendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, content } = SendMessageSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get conversation to find other participants
    const conversationDoc = await adminDb!.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data()!;
    const otherParticipants = conversationData.participantIds.filter((id: string) => id !== 'admin');

    // Add the message
    const messageRef = adminDb!.collection('messages').doc();
    const now = new Date();
    
    await messageRef.set({
      conversationId,
      senderId: 'admin',
      senderName: 'Admin',
      senderRole: 'admin',
      content,
      timestamp: now,
      read: false
    });

    // Update conversation with last message and increment unread counts for other participants
    const updateData: any = {
      lastMessage: content,
      lastMessageAt: now
    };

    // Increment unread count for each other participant
    otherParticipants.forEach((participantId: string) => {
      updateData[`unreadCounts.${participantId}`] = FieldValue.increment(1);
    });

    await adminDb!.collection('conversations').doc(conversationId).update(updateData);

    return NextResponse.json({
      success: true,
      messageId: messageRef.id
    });

  } catch (error) {
    console.error('Error sending message:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to send message'
    }, { status: 500 });
  }
}
