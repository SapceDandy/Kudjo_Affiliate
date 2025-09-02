'use client';

import { RoleGuard } from '@/lib/role-guard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoAuth } from '@/lib/demo-auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["business"]}>
      <RequireBusinessSetup>
        {children}
      </RequireBusinessSetup>
    </RoleGuard>
  );
}

function RequireBusinessSetup({ children }: { children: React.ReactNode }) {
  const { user } = useDemoAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (!user?.uid) return;
        
        // Skip onboarding for demo users
        if (user.uid === 'demo_business_user') {
          if (isMounted) setChecking(false);
          return;
        }
        
        const ref = doc(db, 'businesses', user.uid);
        const snap = await getDoc(ref);
        const data = snap.data();
        const hasDefaults = !!(data && (data.defaultSplitPct || data.couponSettings?.defaultDiscountPct));
        if (!hasDefaults) {
          router.replace('/business/onboard');
          return;
        }
      } catch (e) {
        // Skip onboarding for demo users even on error
        if (user?.uid === 'demo_business_user') {
          if (isMounted) setChecking(false);
          return;
        }
        // If error, be safe and force onboarding
        router.replace('/business/onboard');
        return;
      } finally {
        if (isMounted) setChecking(false);
      }
    })();
    return () => { isMounted = false; };
  }, [user?.uid, router]);

  if (checking) return null;
  return <>{children}</>;
} 