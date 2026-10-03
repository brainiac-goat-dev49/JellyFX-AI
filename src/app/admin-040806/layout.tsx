
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, ADMIN_UID } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';
import { AdminMobileBottomNav } from '@/components/admin/mobile-bottom-nav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if ((ADMIN_UID as string) === "REPLACE_WITH_YOUR_ADMIN_UID") {
        console.error("CRITICAL: ADMIN_UID is not set in src/lib/firebase.ts. Admin panel will not be accessible.");
    }
      
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Check if the logged-in user's UID matches the hardcoded admin UID.
        if (user.uid === ADMIN_UID) {
          setIsAdmin(true);
        } else {
          // If not an admin, redirect to the user dashboard.
          // This is a normal user who tried to access the admin URL.
          router.replace('/dashboard');
        }
      } else {
        // No user logged in, redirect to the main login page.
        router.replace('/login');
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    // This state will be brief as the effect redirects.
    // It also serves as a fallback access denied message.
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <p>Access Denied. Redirecting...</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </main>
        <AdminMobileBottomNav />
      </div>
    </div>
  );
}
