'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'business' | 'influencer';
}

interface DemoAuthContextType {
  user: DemoUser | null;
  loading: boolean;
  switchUser: (role: 'influencer' | 'business' | 'admin') => void;
  switchToInfluencer: () => void;
  switchToBusiness: () => void;
  signOut: () => void;
}

const DemoAuthContext = createContext<DemoAuthContextType | null>(null);

const DEMO_USERS = {
  influencer: {
    uid: 'demo_influencer_user',
    email: 'influencer@demo.com',
    displayName: 'Demo Influencer',
    role: 'influencer' as const
  },
  business: {
    uid: 'demo_business_user', 
    email: 'business@demo.com',
    displayName: 'Demo Business',
    role: 'business' as const
  }
};

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user was explicitly logged out
    const wasLoggedOut = localStorage.getItem('demo-logged-out');
    if (wasLoggedOut) {
      // Don't auto-login if user was logged out
      setUser(null);
      setLoading(false);
      return;
    }

    // Check for persisted user in localStorage
    const persistedUser = localStorage.getItem('demo-user');
    if (persistedUser) {
      try {
        const userData = JSON.parse(persistedUser);
        setUser(userData);
      } catch {
        // If parsing fails, don't auto-login
        setUser(null);
      }
    } else {
      // Don't auto-login by default
      setUser(null);
    }
    setLoading(false);
  }, []);

  const switchUser = (role: 'influencer' | 'business' | 'admin') => {
    const newUser = role === 'admin' ? null : DEMO_USERS[role];
    
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('demo-user', JSON.stringify(newUser));
      localStorage.removeItem('demo-logged-out'); // Clear logout flag
      
      // Navigate to appropriate dashboard immediately
      const dashboardPath = role === 'admin' ? '/control-center' : `/${role}`;
      window.location.href = dashboardPath;
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('demo-user');
    localStorage.setItem('demo-logged-out', 'true'); // Set logout flag
    // Use window.location for immediate redirect
    window.location.href = '/auth/signin';
  };

  const switchToInfluencer = () => switchUser('influencer');
  const switchToBusiness = () => switchUser('business');

  return (
    <DemoAuthContext.Provider value={{ 
      user, 
      loading, 
      switchUser,
      switchToInfluencer,
      switchToBusiness,
      signOut 
    }}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoAuth() {
  const context = useContext(DemoAuthContext);
  if (!context) throw new Error('useDemoAuth must be used within a DemoAuthProvider');
  return {
    ...context,
    switchToInfluencer: () => context.switchUser('influencer'),
    switchToBusiness: () => context.switchUser('business')
  };
}
