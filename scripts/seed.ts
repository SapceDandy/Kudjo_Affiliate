import admin from 'firebase-admin';

async function main() {
  if (admin.apps.length === 0) admin.initializeApp();
  const db = admin.firestore();

  // Users
  const adminUid = 'admin1';
  await db.doc(`users/${adminUid}`).set({ role: 'admin', email: 'admin@example.com', name: 'Admin', phone: '000' });

  // Businesses
  const biz1 = await db.collection('businesses').add({ ownerUid: 'bOwner1', name: 'Cafe One', address: '1 Main', posProvider: 'square', posStatus: 'connected', defaultSplitPct: 20, status: 'active' });
  const biz2 = await db.collection('businesses').add({ ownerUid: 'bOwner2', name: 'Deli Two', address: '2 Main', posProvider: 'manual', posStatus: 'connected', defaultSplitPct: 25, status: 'active' });

  // Offers
  const offer1 = await db.collection('offers').add({ bizId: biz1.id, title: '10% Off', splitPct: 20, publicCode: 'CAFE10', startAt: new Date().toISOString(), status: 'active' });
  const offer2 = await db.collection('offers').add({ bizId: biz2.id, title: 'BOGO', splitPct: 25, publicCode: 'DELI-BOGO', startAt: new Date().toISOString(), status: 'active' });
  const offer3 = await db.collection('offers').add({ bizId: biz2.id, title: 'Free Drink', splitPct: 15, publicCode: 'FREE-DRINK', startAt: new Date().toISOString(), status: 'active' });

  // Influencers
  const inf1 = await db.collection('influencers').add({ ownerUid: 'infOwner1', handle: '@creator1', status: 'active' });
  const inf2 = await db.collection('influencers').add({ ownerUid: 'infOwner2', handle: '@creator2', status: 'active' });
  const inf3 = await db.collection('influencers').add({ ownerUid: 'infOwner3', handle: '@creator3', status: 'active' });

  // Claimed coupons
  await db.collection('contentCoupons').add({ bizId: biz1.id, infId: inf1.id, offerId: offer1.id, code: 'CODE1111', qrUrl: '', singleUse: true, status: 'issued' });
  await db.collection('contentCoupons').add({ bizId: biz2.id, infId: inf2.id, offerId: offer2.id, code: 'CODE2222', qrUrl: '', singleUse: true, status: 'issued' });

  // Affiliate links
  await db.collection('affiliateLinks').add({ bizId: biz1.id, infId: inf1.id, offerId: offer1.id, shortCode: 'A1', url: 'https://example.com/u/A1', qrUrl: '', status: 'active', createdAt: new Date().toISOString() });
  await db.collection('affiliateLinks').add({ bizId: biz2.id, infId: inf3.id, offerId: offer3.id, shortCode: 'A2', url: 'https://example.com/u/A2', qrUrl: '', status: 'active', createdAt: new Date().toISOString() });

  // Outreach campaign
  const camp = await db.doc('admin/outreachCampaigns/camp1').set({ name: 'Launch', fromAccount: 'outreach@example.com', status: 'draft', rateLimitPerMin: 10, templateId: 'tmpl1', createdAt: new Date().toISOString() });
  await db.collection('admin/outreachCampaigns/camp1/recipients').add({ email: 'biz1@example.com', bizName: 'Cafe One', state: 'queued' });
  await db.collection('admin/outreachCampaigns/camp1/recipients').add({ email: 'biz2@example.com', bizName: 'Deli Two', state: 'queued' });
  await db.collection('admin/outreachCampaigns/camp1/recipients').add({ email: 'biz3@example.com', bizName: 'Pizza Three', state: 'queued' });
  await db.collection('admin/outreachCampaigns/camp1/recipients').add({ email: 'biz4@example.com', bizName: 'Burger Four', state: 'queued' });
  await db.collection('admin/outreachCampaigns/camp1/recipients').add({ email: 'biz5@example.com', bizName: 'Taco Five', state: 'queued' });

  console.log('Seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 