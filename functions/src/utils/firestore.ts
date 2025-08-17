import admin from 'firebase-admin';

export const db = () => admin.firestore();
export const col = (path: string) => db().collection(path);
export const doc = (path: string) => db().doc(path); 