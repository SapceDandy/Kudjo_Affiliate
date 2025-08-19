#!/usr/bin/env node

// Admin bulk seeder: creates 200 businesses + 200 influencers quickly, bypassing Auth rate limits
// Requires: scripts/firebase-service-account.json (downloaded from Firebase Console)

const admin = require('firebase-admin');

// Load service account
let svc;
try {
  svc = require('./firebase-service-account.json');
} catch (e) {
  console.error('Missing scripts/firebase-service-account.json');
  process.exit(1);
}

if (admin.apps.length === 0) {
  const normalized = { ...svc, private_key: (svc.private_key || '').replace(/\\n/g, '\n') };
  admin.initializeApp({ credential: admin.credential.cert(normalized) });
}

const auth = admin.auth();
const db = admin.firestore();

const TOTAL_BIZ = 200;
const TOTAL_INF = 200;

function nowIso() { return new Date().toISOString(); }

async function ensureUser(email, password, displayName) {
  try {
    const user = await auth.getUserByEmail(email);
    return user;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      return auth.createUser({ email, password, displayName, disabled: false });
    }
    throw e;
  }
}

async function writeDocsChunked(writes, chunkSize = 450) {
  for (let i = 0; i < writes.length; i += chunkSize) {
    const slice = writes.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const { ref, data } of slice) batch.set(ref, data, { merge: true });
    await batch.commit();
  }
}

async function main() {
  console.log('🚀 Admin bulk seed starting...');
  const t0 = Date.now();

  // 1) Create/ensure auth users
  console.log('👥 Creating auth users...');
  const bizUsers = [];
  for (let i = 1; i <= TOTAL_BIZ; i++) {
    const email = `biz${i}@seed.kudjo.local`;
    const password = `Biz${i}Seed!`;
    const u = await ensureUser(email, password, `Biz ${i}`);
    bizUsers.push({ i, uid: u.uid, email });
    if (i % 50 === 0) console.log(`  - businesses auth ${i}/${TOTAL_BIZ}`);
  }
  const infUsers = [];
  for (let i = 1; i <= TOTAL_INF; i++) {
    const email = `inf${i}@seed.kudjo.local`;
    const password = `Inf${i}Seed!`;
    const u = await ensureUser(email, password, `Influencer ${i}`);
    infUsers.push({ i, uid: u.uid, email });
    if (i % 50 === 0) console.log(`  - influencers auth ${i}/${TOTAL_INF}`);
  }

  // 2) Prepare Firestore writes
  console.log('📝 Preparing Firestore writes...');
  const writes = [];
  const now = nowIso();

  // User profiles
  for (const b of bizUsers) {
    writes.push({ ref: db.collection('users').doc(b.uid), data: { id: b.uid, email: b.email, role: 'business', status: 'active', createdAt: now } });
  }
  for (const f of infUsers) {
    writes.push({ ref: db.collection('users').doc(f.uid), data: { id: f.uid, email: f.email, role: 'influencer', status: 'active', createdAt: now } });
  }

  // Businesses collection
  const bizNames = ["Taco Express","Mario's Italian Bistro","Coffee Corner","Burger Palace","Sushi Master","Thai Garden","BBQ Pit","Noodle Bar","Salad Central","Pizza Place"];
  const cuisines = ["Mexican","Italian","American","Asian","Mediterranean","Thai","BBQ","Cafe"];
  for (const b of bizUsers) {
    const name = `${bizNames[b.i % bizNames.length]} #${b.i}`;
    writes.push({ ref: db.collection('businesses').doc(`biz_${b.i}`), data: {
      id: `biz_${b.i}`,
      name,
      address: `${100 + b.i} Main St, City ${Math.ceil(b.i/5)}`,
      phone: `555-${100 + (b.i % 900)}-${1000 + (b.i % 9000)}`,
      cuisine: cuisines[b.i % cuisines.length],
      posIntegrated: b.i % 3 === 0,
      createdAt: now,
      ownerId: b.uid,
      status: 'active'
    }});
  }

  // Influencers collection
  for (const f of infUsers) {
    writes.push({ ref: db.collection('influencers').doc(`inf_${f.i}`), data: {
      id: `inf_${f.i}`,
      handle: `seed_influencer_${f.i}`,
      name: `Influencer ${f.i}`,
      followers: 1000 + (f.i * 137) % 500000,
      avgViews: 500 + (f.i * 97) % 80000,
      tier: f.i % 10 === 0 ? 'Gold' : f.i % 5 === 0 ? 'Silver' : 'Bronze',
      createdAt: now,
      ownerId: f.uid,
      status: 'active'
    }});
  }

  // 3) Commit in chunks
  console.log(`💾 Writing ${writes.length} docs in chunks...`);
  await writeDocsChunked(writes);

  console.log(`🎉 Done in ${Math.round((Date.now()-t0)/1000)}s. Created ${TOTAL_BIZ} businesses and ${TOTAL_INF} influencers.`);
}

main().catch((e) => { console.error('❌ Failed:', e); process.exit(1); }); 