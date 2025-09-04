import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const NewConversationSchema = z.object({
  recipientId: z.string().min(1),
  recipientType: z.enum(['business', 'influencer']),
  subject: z.string().optional(),
  message: z.string().min(1)
});

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get conversations where admin is a participant
    const conversationsSnapshot = await adminDb
      .collection('conversations')
      .where('participantIds', 'array-contains', 'admin')
      .orderBy('lastMessageAt', 'desc')
      .limit(50)
      .get();

    const conversations = await Promise.all(
      conversationsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get participant details
        const participants = await Promise.all(
          data.participantIds.map(async (id: string) => {
            if (id === 'admin') {
              return {
                id: 'admin',
                name: 'Admin',
                role: 'admin',
                email: 'admin@kudjo.com'
              };
            }

            // Try to find in businesses first
            const businessDoc = await adminDb!.collection('businesses').doc(id).get();
            if (businessDoc.exists) {
              const businessData = businessDoc.data()!;
              return {
                id,
                name: businessData.name || 'Unknown Business',
                role: 'business',
                email: businessData.email || ''
              };
            }

            // Try influencers
            const influencerDoc = await adminDb!.collection('influencers').doc(id).get();
            if (influencerDoc.exists) {
              const influencerData = influencerDoc.data()!;
              return {
                id,
                name: influencerData.name || influencerData.displayName || 'Unknown Influencer',
                role: 'influencer',
                email: influencerData.email || ''
              };
            }

            return {
              id,
              name: 'Unknown User',
              role: 'unknown',
              email: ''
            };
          })
        );

        return {
          id: doc.id,
          participants,
          lastMessage: data.lastMessage || '',
          lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          unreadCount: data.unreadCounts?.admin || 0,
          subject: data.subject || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({
      error: 'Failed to fetch conversations'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientId, recipientType, subject, message } = NewConversationSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check if conversation already exists
    const existingConversation = await adminDb
      .collection('conversations')
      .where('participantIds', 'array-contains-any', ['admin', recipientId])
      .get();

    let conversationId: string;
    
    const matchingConv = existingConversation.docs.find(doc => {
      const data = doc.data();
      return data.participantIds.includes('admin') && data.participantIds.includes(recipientId);
    });

    if (matchingConv) {
      conversationId = matchingConv.id;
    } else {
      // Create new conversation
      const conversationRef = adminDb!.collection('conversations').doc();
      const now = new Date();
      
      await conversationRef.set({
        participantIds: ['admin', recipientId],
        subject: subject || null,
        createdAt: now,
        lastMessage: message,
        lastMessageAt: now,
        unreadCounts: {
          admin: 0,
          [recipientId]: 1
        }
      });
      
      conversationId = conversationRef.id;
    }

    // Add the message
    const messageRef = adminDb!.collection('messages').doc();
    const now = new Date();
    
    await messageRef.set({
      conversationId,
      senderId: 'admin',
      senderName: 'Admin',
      senderRole: 'admin',
      content: message,
      timestamp: now,
      read: false
    });

    // Update conversation with last message
    await adminDb!.collection('conversations').doc(conversationId).update({
      lastMessage: message,
      lastMessageAt: now,
      [`unreadCounts.${recipientId}`]: FieldValue.increment(1)
    });

    return NextResponse.json({
      success: true,
      conversationId
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create conversation'
    }, { status: 500 });
  }
}
