import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, influencerId, businessName, influencerName } = body;

    if (!businessId || !influencerId || !businessName || !influencerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Check if conversation already exists
    const existingConversationQuery = adminDb.collection('conversations')
      .where('businessId', '==', businessId)
      .where('influencerId', '==', influencerId);

    const existingSnapshot = await existingConversationQuery.get();
    
    if (!existingSnapshot.empty) {
      const existingConversation = existingSnapshot.docs[0];
      return NextResponse.json({ 
        conversationId: existingConversation.id,
        existing: true 
      });
    }

    // Create new conversation
    const conversationData = {
      businessId,
      influencerId,
      businessName,
      influencerName,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      unreadCount_business: 0,
      unreadCount_influencer: 0
    };

    const docRef = await adminDb.collection('conversations').add(conversationData);

    return NextResponse.json({ 
      conversationId: docRef.id,
      existing: false 
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ 
      error: 'Failed to create conversation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
