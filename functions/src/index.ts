import * as functions from 'firebase-functions';
import { app } from './server';
import { nightlyReconciliation } from './jobs/reconciliation';

export const api = functions.region('us-central1').https.onRequest(app);

export const reconcileNightly = functions.pubsub.schedule('every day 02:00').onRun(async () => {
  await nightlyReconciliation();
}); 