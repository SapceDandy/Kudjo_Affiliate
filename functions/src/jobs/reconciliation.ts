import admin from 'firebase-admin';

export async function nightlyReconciliation() {
  const db = admin.firestore();
  // Promote pending redemptions older than 7 days to payable
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const pending = await db.collection('redemptions')
    .where('status', '==', 'pending')
    .where('createdAt', '<=', sevenDaysAgo)
    .get();
  const batch = db.batch();
  pending.docs.forEach((d) => {
    batch.update(d.ref, { status: 'payable', finalizedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  await batch.commit();
} 