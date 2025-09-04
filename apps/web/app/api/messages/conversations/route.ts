import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');

    if (!userId || !userType) {
      return NextResponse.json({ error: 'Missing userId or userType' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Query conversations where user is participant
    let conversationsQuery;
    if (userType === 'business') {
      conversationsQuery = adminDb!.collection('conversations')
        .where('businessId', '==', userId)
        .orderBy('lastMessageAt', 'desc');
    } else {
      conversationsQuery = adminDb!.collection('conversations')
        .where('influencerId', '==', userId)
        .orderBy('lastMessageAt', 'desc');
    }

    const conversationsSnapshot = await conversationsQuery.get();
    
    const conversations = conversationsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        businessId: data.businessId,
        influencerId: data.influencerId,
        businessName: data.businessName,
        influencerName: data.influencerName,
        lastMessage: data.lastMessage,
        lastMessageAt: data.lastMessageAt?.toDate(),
        unreadCount: data[`unreadCount_${userType}`] || 0,
        messages: [] // Will be loaded separately when conversation is selected
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch conversations', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
