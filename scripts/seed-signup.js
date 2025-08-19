#!/usr/bin/env node

// Seed via real signup flow using Firebase REST APIs (no service account required)
// - Creates/Signs-in users (admin, business owner, influencer)
// - Writes profile docs and owned docs to Firestore using each user's ID token

const API_KEY = "AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA";
const PROJECT_ID = "kudjo-affiliate";

const IDENTITY_BASE = "https://identitytoolkit.googleapis.com/v1";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function postJson(url, body) {
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
}

async function patchJson(url, body, idToken) {
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
  // Try sign up; if email exists, sign in
  try {
    const r = await postJson(`${IDENTITY_BASE}/accounts:signUp?key=${API_KEY}`, {
      email,
      password,
      returnSecureToken: true,
    });
    return { idToken: r.idToken, refreshToken: r.refreshToken, uid: r.localId };
  } catch (e) {
    if ((e.data?.error?.message || "").includes("EMAIL_EXISTS")) {
      const r = await postJson(`${IDENTITY_BASE}/accounts:signInWithPassword?key=${API_KEY}`, {
        email,
        password,
        returnSecureToken: true,
      });
      return { idToken: r.idToken, refreshToken: r.refreshToken, uid: r.localId };
    }
    throw e;
  }
}

async function writeDoc(collection, docId, data, idToken) {
  const url = `${FIRESTORE_BASE}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;
  const body = { fields: toFirestoreFields(data) };
  return patchJson(url, body, idToken);
}

async function main() {
  const nowIso = new Date().toISOString();

  // Accounts we will create (email/password must comply with your Auth settings)
  const accounts = [
    { role: "admin", email: "devon@getkudjo.com", password: "1234567890!Dd" },
    { role: "business", email: "owner@tacoexpress.com", password: "Owner123!" },
    { role: "influencer", email: "sarah@foodie.com", password: "Influencer123!" },
  ];

  const sessions = {};

  // 1) Sign up / Sign in
  for (const a of accounts) {
    process.stdout.write(`Auth: ${a.email} ... `);
    const s = await signUpOrSignIn(a.email, a.password);
    sessions[a.role] = s;
    console.log("ok");
  }

  // 2) Write user profiles under their own uid
  // Users collection doc id = uid
  for (const a of accounts) {
    const s = sessions[a.role];
    await writeDoc(
      "users",
      s.uid,
      { id: s.uid, email: a.email, role: a.role, createdAt: nowIso, status: "active" },
      s.idToken
    );
  }

  // 3) Create a business owned by the business user
  const bizOwner = sessions["business"];
  await writeDoc(
    "businesses",
    "biz_taco_express",
    {
      id: "biz_taco_express",
      name: "Taco Express",
      address: "456 Oak Ave, Midtown",
      phone: "555-234-5678",
      cuisine: "Mexican",
      posIntegrated: false,
      createdAt: nowIso,
      ownerId: bizOwner.uid,
      status: "active",
    },
    bizOwner.idToken
  );

  // 4) Create an influencer profile owned by the influencer user
  const infl = sessions["influencer"];
  await writeDoc(
    "influencers",
    "inf_foodie_explorer",
    {
      id: "inf_foodie_explorer",
      handle: "foodie_explorer",
      name: "Sarah Johnson",
      followers: 25000,
      avgViews: 12000,
      tier: "Silver",
      createdAt: nowIso,
      ownerId: infl.uid,
      status: "active",
    },
    infl.idToken
  );

  // 5) Create an offer owned by the business (if rules allow business owners to create offers)
  try {
    await writeDoc(
      "offers",
      "off_1",
      {
        id: "off_1",
        businessId: "biz_taco_express",
        title: "20% Off Any Meal",
        description: "Get 20% off any meal",
        discountPercent: 20,
        maxRedemptions: 100,
        currentRedemptions: 0,
        startDate: nowIso,
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        createdAt: nowIso,
        status: "active",
      },
      bizOwner.idToken
    );
  } catch (e) {
    console.warn("Offer write skipped due to rules:", e.message);
  }

  // 6) Create a coupon linking business + influencer (try with business token first)
  try {
    await writeDoc(
      "coupons",
      "AFF-TAC-FOO-ABC123",
      {
        id: "AFF-TAC-FOO-ABC123",
        type: "AFFILIATE",
        businessId: "biz_taco_express",
        influencerId: "inf_foodie_explorer",
        offerId: "off_1",
        createdAt: nowIso,
        deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        status: "ACTIVE",
        posAdded: true,
        usageCount: 0,
        lastUsedAt: nowIso,
      },
      bizOwner.idToken
    );
  } catch (e) {
    console.warn("Coupon write skipped due to rules:", e.message);
  }

  console.log("\n✅ Seed complete using real signup flow.");
  console.log("Users created:");
  for (const a of accounts) console.log(`- ${a.role}: ${a.email}`);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message, e.data || "");
  process.exit(1);
}); 