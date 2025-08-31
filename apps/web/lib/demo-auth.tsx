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
  switchUser: (userId: string) => void;
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
    // Check for persisted user in localStorage
    const persistedUser = localStorage.getItem('demo-user');
    if (persistedUser) {
      try {
        const userData = JSON.parse(persistedUser);
        setUser(userData);
      } catch {
        // If parsing fails, default to influencer
        setUser(DEMO_USERS.influencer);
        localStorage.setItem('demo-user', JSON.stringify(DEMO_USERS.influencer));
      }
    } else {
      // Initialize with influencer user by default
      setUser(DEMO_USERS.influencer);
      localStorage.setItem('demo-user', JSON.stringify(DEMO_USERS.influencer));
    }
    setLoading(false);
  }, []);

  const switchUser = (userId: string) => {
    let newUser = null;
    if (userId === 'influencer') {
      newUser = DEMO_USERS.influencer;
    } else if (userId === 'business') {
      newUser = DEMO_USERS.business;
    }
    
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('demo-user', JSON.stringify(newUser));
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('demo-user');
  };

  const switchToInfluencer = () => switchUser('influencer');
  const switchToBusiness = () => switchUser('business');

  return (
    <DemoAuthContext.Provider value={{ 
      user, 
      loading, 
      switchUser,
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
