export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });

    // Optional demo data bootstrap on server start
    if (process.env.DEMO_SEED_ON_BOOT === '1' || process.env.NEXT_PUBLIC_DEMO === '1') {
      try {
        const admin = await import('firebase-admin');
        // Initialize Admin SDK if needed
        if (admin.apps.length === 0) {
          const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
          const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
          const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
          if (projectId && clientEmail && privateKey) {
            admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
          } else {
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
            if (!initialized) {
              // Skip if no credentials (local dev without service account)
              console.warn('DEMO_SEED_ON_BOOT enabled but missing Firebase Admin credentials; skipping demo seed');
              return;
            }
          }
        }

        const db = admin.firestore();
        const auth = admin.auth();

        // Demo identities
        const businessUid = 'demo_business_user';
        const influencerUid = 'demo_influencer_user';
        const businessEmail = 'demo.business@example.com';
        const influencerEmail = 'demo.influencer@example.com';
        const demoPassword = 'demo123';

        // Ensure auth users exist (idempotent)
        async function ensureUser(uid: string, email: string, displayName: string) {
          try {
            await auth.createUser({ uid, email, password: demoPassword, displayName });
          } catch (e: any) {
            if (e?.code === 'auth/uid-already-exists' || e?.code === 'auth/email-already-exists') {
              // ok
            } else {
              throw e;
            }
          }
        }

        await ensureUser(businessUid, businessEmail, 'Demo Business');
        await ensureUser(influencerUid, influencerEmail, 'Demo Influencer');

        const now = new Date().toISOString();

        // Firestore docs (idempotent merges)
        await db.collection('users').doc(businessUid).set({ id: businessUid, email: businessEmail, role: 'business', status: 'active', createdAt: now }, { merge: true });
        await db.collection('businesses').doc(businessUid).set({ id: businessUid, ownerId: businessUid, name: 'Demo Bistro', website: 'https://demo.bistro', address: '123 Congress Ave, Austin, TX', geo: { lat: 30.2672, lng: -97.7431 }, status: 'active', createdAt: now }, { merge: true });

        await db.collection('users').doc(influencerUid).set({ id: influencerUid, email: influencerEmail, role: 'influencer', status: 'active', createdAt: now }, { merge: true });
        await db.collection('influencers').doc(influencerUid).set({ id: influencerUid, ownerId: influencerUid, handle: '@demo_influencer', approved: true, preferredGeo: { lat: 30.28, lng: -97.74 }, createdAt: now }, { merge: true });

        // A simple demo offer for business
        await db.collection('offers').doc('demo_offer').set({ id: 'demo_offer', bizId: businessUid, title: '20% Off Any Entree', description: 'Enjoy 20% off your meal at Demo Bistro', splitPct: 20, status: 'active', active: true, createdAt: now }, { merge: true });

        console.log('Demo seed on boot completed');
      } catch (e) {
        console.error('Demo seed on boot failed:', e);
      }
    }
  }
} 