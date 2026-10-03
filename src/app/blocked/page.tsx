
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function BlockedPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reason, setReason] = useState('No reason provided.');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.status !== 'blocked') {
                        router.replace('/dashboard');
                    } else {
                        setReason(userData.blockReason || 'No reason provided.');
                        setLoading(false);
                    }
                } else {
                     // User doc doesn't exist, sign out
                    await signOut(auth);
                    router.replace('/login');
                }
            } else {
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <div className="mb-6 flex items-center gap-3">
                <Image src="https://i.ibb.co/3S1PNY1/Cap-Wallet-Logo.png" alt="CapWallet Logo" width={32} height={32} />
                <h1 className="text-3xl font-bold text-primary">CapWallet</h1>
            </div>
            <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-lg">
                <ShieldOff className="mx-auto h-16 w-16 text-destructive" />
                <h2 className="mt-6 text-2xl font-bold text-destructive">Account Blocked</h2>
                <p className="mt-2 text-muted-foreground">
                    Your account has been permanently blocked due to a violation of our terms of service.
                </p>
                <div className="mt-4 rounded-md bg-muted p-4 text-left text-sm">
                    <p className="font-semibold">Reason:</p>
                    <p className="text-muted-foreground">{reason}</p>
                </div>
                <p className="mt-6 text-xs text-muted-foreground">
                    If you believe this is a mistake, please contact our support team at <a href="mailto:capwallet.support@instmail.uk" className="underline">capwallet.support@instmail.uk</a>.
                </p>
                <Button onClick={handleLogout} className="mt-6 w-full" variant="secondary">
                    Logout
                </Button>
            </div>
        </main>
    );
}

    