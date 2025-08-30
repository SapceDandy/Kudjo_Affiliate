import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

async function getAdmin() {
  const admin = await import('firebase-admin');
  try {
    if (admin.apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
      } else {
        // Fallback to local service account file if available
        const fs = await import('fs');
        const path = await import('path');
        const candidates = [
          path.resolve(process.cwd(), 'scripts/firebase-service-account.json'),
          path.resolve(process.cwd(), 'service-account.json'),
        ];
        let initialized = false;
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            const sa = JSON.parse(fs.readFileSync(p, 'utf-8'));
            admin.initializeApp({ credential: admin.credential.cert(sa) });
            initialized = true;
            break;
          }
        }
        if (!initialized) throw new Error('Missing Firebase Admin credentials');
      }
    }
  } catch (e) {
    console.error('Admin init error:', e);
    throw e;
  }
  return admin;
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!adminDb) return NextResponse.json({ error: 'Admin DB not available' }, { status: 500 });
    const body = await request.json();
    const { role, email, displayName, businessName, website, influencerName, pages, password } = body as any;
    if (!role || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (role === 'business' && (!businessName || !website)) return NextResponse.json({ error: 'Business name and website required' }, { status: 400 });
    if (role === 'influencer' && (!influencerName || !pages || !Array.isArray(pages) || pages.length === 0)) return NextResponse.json({ error: 'Influencer name and pages required' }, { status: 400 });

    const admin = await getAdmin();
    const auth = admin.auth();
    const effectivePassword = typeof password === 'string' && password.length >= 6 ? password : generatePassword(12);

    // Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.createUser({ email, password: effectivePassword, displayName: displayName || email });
    } catch (e: any) {
      if (e?.code === 'auth/email-already-exists') {
        // If the auth user exists, fetch it
        userRecord = await auth.getUserByEmail(email);
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;
    const nowIso = new Date().toISOString();

    // Create/merge Firestore user doc
    await adminDb.collection('users').doc(uid).set({
      id: uid,
      email,
      displayName: displayName || userRecord.displayName || email,
      role,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true });

    if (role === 'business') {
      await adminDb.collection('businesses').doc(uid).set({
        id: uid,
        ownerId: uid,
        name: businessName,
        website,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });
    } else if (role === 'influencer') {
      await adminDb.collection('influencers').doc(uid).set({
        id: uid,
        ownerId: uid,
        handle: influencerName,
        pages,
        approved: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      }, { merge: true });
    }

    const response: any = { success: true, id: uid, email };
    if (!password) {
      response.generatedPassword = effectivePassword;
    }
    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    console.error('Create user error:', e);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}


