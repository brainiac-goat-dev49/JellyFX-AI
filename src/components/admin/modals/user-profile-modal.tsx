"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, WalletData } from '@/lib/types';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { ExternalLink, Mail, Phone, Globe, DollarSign, Shield, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);

  useEffect(() => {
    if (!user || !isOpen) {
      setWallet(null);
      return;
    }

    const walletRef = ref(rtdb, `wallets/${user.uid}`);
    const unsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setWallet(snapshot.val());
      } else {
        setWallet(null);
      }
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            User Profile Overview
          </DialogTitle>
          <DialogDescription>
            Account snapshot for {user.fullName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={user.photoURL || undefined} alt={user.fullName} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                {user.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base leading-none">{user.fullName}</p>
                <Badge variant={user.status === 'active' ? 'secondary' : user.status === 'blocked' ? 'destructive' : 'outline'}>
                  {user.status || 'active'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> {user.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-card space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> Country
              </span>
              <p className="font-semibold text-foreground">{user.country || 'Not specified'}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone
              </span>
              <p className="font-semibold text-foreground">{user.phone || 'None'}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Main Balance
              </span>
              <p className="font-bold text-sm text-foreground">${(wallet?.balance || 0).toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Referral Code
              </span>
              <p className="font-mono font-semibold text-foreground">{user.referralCode || 'None'}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button asChild>
            <Link href={`/admin-040806/users/${user.uid}`}>
              Manage User <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
