'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, auth as firebaseAuth, db as firebaseDb } from './firebase';

// No need to initialize Firebase here as it's already initialized in firebase.ts

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'business' | 'influencer' | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<'business' | 'influencer' | null>;
  signUp: (email: string, password: string, role: 'business' | 'influencer') => Promise<'business' | 'influencer'>;
  signInWithGoogle: (role: 'business' | 'influencer', options?: { debug?: boolean }) => Promise<'business' | 'influencer'>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  // Check for admin cookie
  const checkAdminSession = async () => {
    try {
      const response = await fetch('/api/control-center/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) return null;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;

      const data = await response.json();
      if (data.isAdmin && data.email) {
        return {
          role: 'admin',
          email: data.email,
        } as const;
      }
      return null;
    } catch (error) {
      console.error('Error checking admin session:', error);
      return null;
    }
  };

  // Fetch user role from Firestore
  const fetchUserRole = async (firebaseUser: FirebaseUser) => {
    const db = firebaseDb;
    const businessDoc = await getDoc(doc(db, 'businesses', firebaseUser.uid));
    if (businessDoc.exists()) return 'business' as const;
    const influencerDoc = await getDoc(doc(db, 'influencers', firebaseUser.uid));
    if (influencerDoc.exists()) return 'influencer' as const;
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Initializing auth state');
        }
        // First, try to resolve admin session once
        const adminSession = await checkAdminSession();
        if (!isMounted) return;
        if (adminSession) {
          console.log('Admin session detected');
          setUser({ uid: 'admin', email: adminSession.email, displayName: 'Administrator', photoURL: null, role: 'admin' });
          setLoading(false);
          return; // Do not attach Firebase listener for admin session
        }

        // Otherwise attach Firebase listener
        const auth = firebaseAuth;
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (!isMounted) return;
            setLoading(true);
            if (firebaseUser) {
              if (process.env.NODE_ENV === 'development') {
                console.log('Firebase user detected:', firebaseUser.uid);
              }
              const role = await fetchUserRole(firebaseUser);
              if (process.env.NODE_ENV === 'development') {
                console.log('User role from Firestore:', role);
              }
              const userObj = { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, role };
              console.log('Setting user state:', userObj);
              setUser(userObj);
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('No user detected, setting user to null');
              }
              setUser(null);
            }
          } catch (err) {
            console.error('Auth state change error:', err);
            setError(err instanceof Error ? err : new Error('Authentication error'));
          } finally {
            setLoading(false);
          }
        });

        return () => {
          console.log('Cleaning up Firebase auth state listener');
          unsubscribe();
        };
      } catch (err) {
        console.error('Auth init error:', err);
        setError(err instanceof Error ? err : new Error('Authentication error'));
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const auth = firebaseAuth;
      const result = await signInWithEmailAndPassword(auth, email, password);
      const role = await fetchUserRole(result.user);
      setUser({ uid: result.user.uid, email: result.user.email, displayName: result.user.displayName, photoURL: result.user.photoURL, role });
      return role;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err : new Error('Sign in failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: 'business' | 'influencer'
  ): Promise<'business'> => {
    setLoading(true);
    setError(null);
    try {
      const auth = firebaseAuth;
      const db = firebaseDb;
      // Only businesses are allowed to self-register.
      if (role !== 'business') {
        throw new Error('Only businesses can sign up. Influencers are created by admin.');
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'businesses', result.user.uid), {
        ownerId: result.user.uid,
        email,
        createdAt: serverTimestamp(),
        status: 'active',
      }, { merge: true });
      setUser({ uid: result.user.uid, email: result.user.email, displayName: result.user.displayName, photoURL: result.user.photoURL, role: 'business' });
      return 'business';
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err instanceof Error ? err : new Error('Sign up failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (role: 'business' | 'influencer', options?: { debug?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const auth = firebaseAuth;
      const db = firebaseDb;
      const { googleProvider } = require('./firebase');
      console.log('Starting Google sign-in process for role:', role);
      
      // If in debug mode, simulate a successful sign-in
      if (options?.debug) {
        console.log('DEBUG MODE: Simulating Google sign-in');
        // Wait a moment to simulate network request
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Return the requested role without actually signing in or updating user state
        console.log('DEBUG MODE: Returning role:', role);
        return role;
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google sign-in successful, user:', result.user.uid);

      const businessDoc = await getDoc(doc(db, 'businesses', result.user.uid));
      const influencerDoc = await getDoc(doc(db, 'influencers', result.user.uid));

      let userRole: 'business' | 'influencer' = role;
      let needsRoleCreation = false;
      if (businessDoc.exists() && role === 'influencer') {
        console.log('User already exists as a business but trying to sign in as influencer');
        userRole = 'business';
      } else if (influencerDoc.exists() && role === 'business') {
        console.log('User already exists as an influencer but trying to sign in as business');
        userRole = 'influencer';
      } else if (!businessDoc.exists() && !influencerDoc.exists()) {
        needsRoleCreation = true;
        console.log('New user, creating in collection:', role);
      }

      if (needsRoleCreation) {
        const collectionName = userRole === 'business' ? 'businesses' : 'influencers';
        console.log('Creating user document in collection:', collectionName);
        try {
          await setDoc(doc(db, collectionName, result.user.uid), {
            ownerId: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            createdAt: serverTimestamp(),
            status: 'active',
          }, { merge: true });
          console.log('User document created successfully');
        } catch (docError) {
          console.error('Error creating user document:', docError);
          throw new Error('Failed to create user profile: ' + (docError instanceof Error ? docError.message : 'Unknown error'));
        }
      }

      // Set user state immediately after successful authentication
      const newUser = { 
        uid: result.user.uid, 
        email: result.user.email, 
        displayName: result.user.displayName, 
        photoURL: result.user.photoURL, 
        role: userRole 
      };
      setUser(newUser);
      console.log('User authenticated successfully with role:', userRole, 'User object:', newUser);
      return userRole;
    } catch (err) {
      console.error('Google sign in error:', err);
      let errorMessage = 'Google sign in failed';
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('permission') || msg.includes('insufficient')) {
          errorMessage = 'Google sign-in failed: Missing or insufficient permissions. If this is your first sign-in, publish updated Firestore rules so owners can create their own business/influencer docs.';
        } else if (msg.includes('popup')) {
          errorMessage = 'Google sign-in popup was closed or blocked. Please try again and allow popups for this site.';
        } else if (msg.includes('network')) {
          errorMessage = 'Network error during Google sign-in. Please check your internet connection.';
        } else {
          errorMessage = `Google sign-in failed: ${err.message}`;
        }
      }
      setError(new Error(errorMessage));
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.role === 'admin') {
        await fetch('/api/control-center/logout', { method: 'POST', credentials: 'include' });
      } else {
        const auth = firebaseAuth;
        await firebaseSignOut(auth);
      }
      setUser(null);
      // Always send user back to home after sign-out
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err : new Error('Sign out failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
} 