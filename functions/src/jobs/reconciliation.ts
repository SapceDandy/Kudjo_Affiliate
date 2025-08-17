import admin from 'firebase-admin';

export async function nightlyReconciliation() {
  const db = admin.firestore();
  const pending = await db.collection('redemptions').where('status', '==', 'provisional').get();
  const batch = db.batch();
  pending.docs.forEach((d) => {
    batch.update(d.ref, { status: 'finalized', finalizedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  await batch.commit();
} 