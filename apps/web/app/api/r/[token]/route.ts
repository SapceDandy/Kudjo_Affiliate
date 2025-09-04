import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // Get affiliate link by token (doc id = token for O(1) lookup)
    const linkRef = adminDb.collection('affiliate_links').doc(token);
    const linkSnap = await linkRef.get();

    if (!linkSnap.exists) {
      return NextResponse.redirect(new URL('/404', request.url));
    }

    const linkData = linkSnap.data()!;

    // Increment click count in assignment stats
    if (linkData.assignmentId) {
      const assignmentRef = adminDb.collection('offer_assignments').doc(linkData.assignmentId);
      await assignmentRef.set({
        stats: {
          clicks: admin.firestore.FieldValue.increment(1)
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Get destination URL
    const destinationUrl = linkData.destinationUrl || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://kudjo.app'}/offer/${linkData.offerId}?i=${linkData.influencerId}`;

    // Redirect to destination
    return NextResponse.redirect(destinationUrl, 302);

  } catch (error) {
    console.error('Affiliate link redirect error:', error);
    return NextResponse.redirect(new URL('/404', request.url));
  }
}
