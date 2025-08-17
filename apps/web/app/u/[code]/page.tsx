'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ShortRedirect({ params }: { params: { code: string } }) {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'shortUrls', params.code));
      const url = snap.exists() ? (snap.data() as any).url : '/';
      router.replace(url);
    })();
  }, [params.code, router]);
  return <main className="p-6">Redirecting…</main>;
} 