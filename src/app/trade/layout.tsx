
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/lib/types';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { Header } from '@/components/dashboard/header';
import { Loader2 } from 'lucide-react';
import { UserContext } from '@/hooks/use-user';
import { DashboardStateProvider } from '@/hooks/use-dashboard-state';
import { ImpersonationBanner } from '@/components/dashboard/impersonation-banner';

export default function TradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const impersonatedUserJson = sessionStorage.getItem('impersonating_user');
    if (impersonatedUserJson) {
      const impersonatedUser = JSON.parse(impersonatedUserJson);
      setUser(impersonatedUser);
      setFirebaseUser(null);
      setLoading(false);
      setIsImpersonating(true);
      return;
    }
    setIsImpersonating(false);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUser(null);
        router.replace('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (isImpersonating || !firebaseUser) {
      if (!isImpersonating) setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUser({ uid: firebaseUser.uid, ...doc.data() } as User);
      } else {
        setUser(null);
        auth.signOut();
        router.replace('/login');
      }
      setLoading(false);
    }, (error) => {
        console.error("Snapshot listener error:", error);
        setUser(null);
        setLoading(false);
        router.replace('/login');
    });
    
    return () => unsubscribeSnapshot();
  }, [firebaseUser, router, isImpersonating]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This state is brief, as the effects will redirect.
    // It prevents rendering the layout for a moment before the redirect happens.
    return null;
  }

  return (
    <UserContext.Provider value={user}>
     <DashboardStateProvider>
        {isImpersonating && <ImpersonationBanner />}
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
              {children}
            </main>
            <MobileBottomNav />
          </div>
        </div>
      </DashboardStateProvider>
    </UserContext.Provider>
  );
}
