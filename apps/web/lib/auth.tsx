'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'business' | 'influencer') => Promise<void>;
  signInWithGoogle: (role: 'business' | 'influencer') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check for admin cookie
  const checkAdminSession = async () => {
    try {
      const response = await fetch('/api/control-center/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isAdmin && data.email) {
          return {
            role: 'admin',
            email: data.email,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking admin session:', error);
      return null;
    }
  };

  // Fetch user role from Firestore
  const fetchUserRole = async (firebaseUser: FirebaseUser) => {
    // Use the imported firebaseDb instead of creating a new instance
    const db = firebaseDb;
    
    // Check business collection first
    const businessDoc = await getDoc(doc(db, 'businesses', firebaseUser.uid));
    if (businessDoc.exists()) {
      return 'business';
    }
    
    // Then check influencer collection
    const influencerDoc = await getDoc(doc(db, 'influencers', firebaseUser.uid));
    if (influencerDoc.exists()) {
      return 'influencer';
    }
    
    return null;
  };

  useEffect(() => {
    // Use the imported firebaseAuth instead of creating a new instance
    const auth = firebaseAuth;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        
        // Check for admin session first
        const adminSession = await checkAdminSession();
        
        if (adminSession) {
          // User is an admin
          setUser({
            uid: 'admin',
            email: adminSession.email,
            displayName: 'Administrator',
            photoURL: null,
            role: 'admin',
          });
        } else if (firebaseUser) {
          // Regular Firebase user, fetch role
          const role = await fetchUserRole(firebaseUser);
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role,
          });
        } else {
          // No user
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err instanceof Error ? err : new Error('Authentication error'));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the imported firebaseAuth instead of creating a new instance
      const auth = firebaseAuth;
      const result = await signInWithEmailAndPassword(auth, email, password);
      const role = await fetchUserRole(result.user);
      
      // Update user with role
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        role,
      });
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err : new Error('Sign in failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, role: 'business' | 'influencer') => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the imported firebaseAuth and firebaseDb instead of creating new instances
      const auth = firebaseAuth;
      const db = firebaseDb;
      
      // Create user in Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in appropriate collection
      const collectionName = role === 'business' ? 'businesses' : 'influencers';
      await setDoc(doc(db, collectionName, result.user.uid), {
        email,
        createdAt: new Date().toISOString(),
        status: 'active',
      });
      
      // Update user with role
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        role,
      });
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err instanceof Error ? err : new Error('Sign up failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (role: 'business' | 'influencer') => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the imported firebaseAuth and firebaseDb instead of creating new instances
      const auth = firebaseAuth;
      const provider = new GoogleAuthProvider();
      const db = firebaseDb;
      
      // Sign in with Google
      const result = await signInWithPopup(auth, provider);
      
      // Check if user exists in either collection to determine if they already have a role
      const businessDoc = await getDoc(doc(db, 'businesses', result.user.uid));
      const influencerDoc = await getDoc(doc(db, 'influencers', result.user.uid));
      
      let userRole = role;
      let needsRoleCreation = false;
      
      // If user exists in a collection that doesn't match the selected role, we need to handle this case
      if (businessDoc.exists() && role === 'influencer') {
        console.log('User already exists as a business but trying to sign in as influencer');
        userRole = 'business';
      } else if (influencerDoc.exists() && role === 'business') {
        console.log('User already exists as an influencer but trying to sign in as business');
        userRole = 'influencer';
      } else if (!businessDoc.exists() && !influencerDoc.exists()) {
        // New user, create in the selected role collection
        needsRoleCreation = true;
      }
      
      // Create user document if needed
      if (needsRoleCreation) {
        const collectionName = userRole === 'business' ? 'businesses' : 'influencers';
        await setDoc(doc(db, collectionName, result.user.uid), {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
          status: 'active',
        });
      }
      
      // Update user with role
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        role: userRole,
      });
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err instanceof Error ? err : new Error('Google sign in failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if user is admin
      if (user?.role === 'admin') {
        // Sign out from admin session
        await fetch('/api/control-center/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } else {
        // Sign out from Firebase
        const auth = firebaseAuth;
        await firebaseSignOut(auth);
      }
      
      setUser(null);
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
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 