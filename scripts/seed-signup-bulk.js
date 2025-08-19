#!/usr/bin/env node

// Bulk seed 200 businesses and 200 influencers through the real signup flow
// - No service account, no emulator, no CLI import
// - Uses Firebase Auth REST to create/sign-in accounts
// - Uses each user's ID token to write Firestore docs (mirrors app behavior)
// - Safe to re-run (existing accounts will just sign in)
// - Resumable via env: START_BIZ, COUNT_BIZ, START_INF, COUNT_INF

const API_KEY = "AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA";
const PROJECT_ID = "kudjo-affiliate";

const IDENTITY_BASE = "https://identitytoolkit.googleapis.com/v1";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const DEFAULT_TOTAL_BUSINESSES = 200;
const DEFAULT_TOTAL_INFLUENCERS = 200;
const MAX_PARALLEL = 3; // conservative to avoid throttling
const SLICE_SLEEP_MS = 3000; // wait between slices to ease rate limits

const START_BIZ = parseInt(process.env.START_BIZ || '1', 10);
const COUNT_BIZ = parseInt(process.env.COUNT_BIZ || String(DEFAULT_TOTAL_BUSINESSES - START_BIZ + 1), 10);
const START_INF = parseInt(process.env.START_INF || '1', 10);
const COUNT_INF = parseInt(process.env.COUNT_INF || String(DEFAULT_TOTAL_INFLUENCERS - START_INF + 1), 10);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJsonWithRetry(makeRequest, labelForLogs) {
  let attempt = 0;
  let delay = 2000; // 2s initial backoff
  const maxDelay = 120000; // 2 minutes
  const maxAttempts = 10;
  for (;;) {
    try {
      return await makeRequest();
    } catch (e) {
      const msg = e?.data?.error?.message || e.message || '';
      const status = e.status || 0;
      const retryable = status === 429 || status === 500 || status === 503 || /TOO_MANY_ATTEMPTS_TRY_LATER|QUOTA|EXCEEDED|RATE_LIMIT|INTERNAL/i.test(msg);
      attempt += 1;
      if (!retryable || attempt >= maxAttempts) {
        throw e;
      }
      // jittered exponential backoff
      const wait = Math.min(maxDelay, Math.round(delay * (1 + Math.random())));
      process.stdout.write(`\n⚠️ Throttled on ${labelForLogs || 'request'}: ${msg}. Retry ${attempt}/${maxAttempts} in ${Math.round(wait/1000)}s...\n`);
      await sleep(wait);
      delay = Math.min(maxDelay, delay * 2);
    }
  }
}

async function postJson(url, body, label) {
  return fetchJsonWithRetry(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }, label);
}

async function patchJson(url, body, idToken, label) {
  return fetchJsonWithRetry(async () => {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }, label);
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (Number.isInteger(v)) fields[k] = { integerValue: String(v) };
    else if (typeof v === "number") fields[k] = { doubleValue: v };
    else if (v instanceof Date) fields[k] = { timestampValue: v.toISOString() };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map((x) => ({ stringValue: String(x) })) } };
    else if (typeof v === "object") fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
    else fields[k] = { stringValue: String(v) };
  }
  return fields;
}

async function signUpOrSignIn(email, password) {
  try {
    const r = await postJson(`${IDENTITY_BASE}/accounts:signUp?key=${API_KEY}`, {
      email,
      password,
      returnSecureToken: true,
    }, `signUp ${email}`);
    return { idToken: r.idToken, refreshToken: r.refreshToken, uid: r.localId };
  } catch (e) {
    const msg = e?.data?.error?.message || '';
    if (msg.includes("EMAIL_EXISTS")) {
      const r = await postJson(`${IDENTITY_BASE}/accounts:signInWithPassword?key=${API_KEY}`, {
        email,
        password,
        returnSecureToken: true,
      }, `signIn ${email}`);
      return { idToken: r.idToken, refreshToken: r.refreshToken, uid: r.localId };
    }
    throw e;
  }
}

async function writeDoc(collection, docId, data, idToken) {
  const url = `${FIRESTORE_BASE}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;
  const body = { fields: toFirestoreFields(data) };
  return patchJson(url, body, idToken, `write ${collection}/${docId}`);
}

function makeBiz(i, ownerUid, nowIso) {
  const names = ["Taco Express", "Mario's Italian Bistro", "Coffee Corner", "Burger Palace", "Sushi Master", "Thai Garden", "BBQ Pit", "Noodle Bar", "Salad Central", "Pizza Place"]; 
  const cuisines = ["Mexican", "Italian", "American", "Asian", "Mediterranean", "Thai", "BBQ", "Cafe"];
  return {
    id: `biz_${i}`,
    name: `${names[i % names.length]} #${i}`,
    address: `${100 + i} Main St, City ${Math.ceil(i/5)}`,
    phone: `555-${100 + (i % 900)}-${1000 + (i % 9000)}`,
    cuisine: cuisines[i % cuisines.length],
    posIntegrated: i % 3 === 0,
    createdAt: nowIso,
    ownerId: ownerUid,
    status: "active",
  };
}

function makeInfluencer(i, ownerUid, nowIso) {
  return {
    id: `inf_${i}`,
    handle: `seed_influencer_${i}`,
    name: `Influencer ${i}`,
    followers: 1000 + (i * 137) % 500000,
    avgViews: 500 + (i * 97) % 80000,
    tier: i % 10 === 0 ? "Gold" : i % 5 === 0 ? "Silver" : "Bronze",
    createdAt: nowIso,
    ownerId: ownerUid,
    status: "active",
  };
}

async function processInBatches(items, handler, label) {
  for (let i = 0; i < items.length; i += MAX_PARALLEL) {
    const slice = items.slice(i, i + MAX_PARALLEL);
    process.stdout.write(`${label} ${i + 1}-${Math.min(i + MAX_PARALLEL, items.length)}... `);
    // Best-effort: do not fail entire slice if one fails
    await Promise.all(slice.map(async (it) => {
      try { await handler(it); } catch (e) { console.warn(`\n❗ ${label} item error:`, e.message); }
    }));
    console.log("ok");
    await sleep(SLICE_SLEEP_MS);
  }
}

async function main() {
  const nowIso = new Date().toISOString();

  // Prepare accounts (resumable windows)
  const businessAccounts = Array.from({ length: COUNT_BIZ }, (_, idx) => {
    const i = START_BIZ + idx;
    return { email: `biz${i}@seed.kudjo.local`, password: `Biz${i}Seed!`, role: "business", idx: i };
  });
  const influencerAccounts = Array.from({ length: COUNT_INF }, (_, idx) => {
    const i = START_INF + idx;
    return { email: `inf${i}@seed.kudjo.local`, password: `Inf${i}Seed!`, role: "influencer", idx: i };
  });

  const businessSessions = new Map();
  const influencerSessions = new Map();

  // 1) Auth for business accounts
  await processInBatches(businessAccounts, async (a) => {
    const s = await signUpOrSignIn(a.email, a.password);
    businessSessions.set(a.idx, s);
  }, "Auth(business)");

  // 2) Auth for influencer accounts
  await processInBatches(influencerAccounts, async (a) => {
    const s = await signUpOrSignIn(a.email, a.password);
    influencerSessions.set(a.idx, s);
  }, "Auth(influencer)");

  // 3) Write users docs (uid as doc id)
  await processInBatches(businessAccounts, async (a) => {
    const s = businessSessions.get(a.idx);
    if (!s) return;
    await writeDoc("users", s.uid, { id: s.uid, email: a.email, role: "business", createdAt: nowIso, status: "active" }, s.idToken);
  }, "Users(business)");

  await processInBatches(influencerAccounts, async (a) => {
    const s = influencerSessions.get(a.idx);
    if (!s) return;
    await writeDoc("users", s.uid, { id: s.uid, email: a.email, role: "influencer", createdAt: nowIso, status: "active" }, s.idToken);
  }, "Users(influencer)");

  // 4) Write businesses collection
  await processInBatches(businessAccounts, async (a) => {
    const s = businessSessions.get(a.idx);
    if (!s) return;
    const biz = makeBiz(a.idx, s.uid, nowIso);
    await writeDoc("businesses", biz.id, biz, s.idToken);
  }, "Businesses");

  // 5) Write influencers collection
  await processInBatches(influencerAccounts, async (a) => {
    const s = influencerSessions.get(a.idx);
    if (!s) return;
    const inf = makeInfluencer(a.idx, s.uid, nowIso);
    await writeDoc("influencers", inf.id, inf, s.idToken);
  }, "Influencers");

  console.log("\n✅ Bulk seed complete via real signup flow.");
  console.log(`Created/ensured: ${COUNT_BIZ} businesses (from ${START_BIZ}), ${COUNT_INF} influencers (from ${START_INF}).`);
  console.log("Tip: Use START_BIZ/COUNT_BIZ/START_INF/COUNT_INF env vars to resume partial windows.");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message, e.data || "");
  process.exit(1);
}); 