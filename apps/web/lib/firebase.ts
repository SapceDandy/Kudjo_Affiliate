'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Initialize Firebase using env vars if provided, otherwise the supplied defaults
let app: any;
try {
	if (getApps().length === 0) {
		const config = {
			apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAexxuzGNEV9Al1-jIJAJt_2tMeVR0jfpA',
			authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'kudjo-affiliate.firebaseapp.com',
			projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kudjo-affiliate',
			storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'kudjo-affiliate.firebasestorage.app',
			messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '943798260444',
			appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:943798260444:web:c8c2ce35ee63c639865a19',
			measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-2JNJ612PZT',
		};
		app = initializeApp(config);
		console.log('Firebase initialized successfully');
	} else {
		app = getApps()[0];
	}
} catch (error) {
	console.error('Firebase initialization error:', error);
	// Fallback minimal init to keep app from crashing
	app = getApps().length === 0
		? initializeApp({
			apiKey: 'placeholder',
			authDomain: 'placeholder.firebaseapp.com',
			projectId: 'placeholder',
			storageBucket: 'placeholder.appspot.com',
			messagingSenderId: '000000000000',
			appId: 'placeholder',
		})
		: getApps()[0];
}

// Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulator in development (disabled to use production data)
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
//   try {
//     // Connect to Firestore emulator
//     const { connectFirestoreEmulator } = require('firebase/firestore');
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     console.log('Connected to Firestore emulator');
//   } catch (error: any) {
//     // Emulator already connected or not available
//     console.log('Firestore emulator connection:', error?.message || 'Connection attempt failed');
//   }
// }

// Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
// Minimal required scopes
try {
	googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
	googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
} catch {}

// Analytics (browser only)
let analytics: any = null;
if (typeof window !== 'undefined') {
	isSupported().then((yes) => yes && (analytics = getAnalytics(app)));
}

export { app, auth, db, storage, analytics, googleProvider };
