
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Snowflake, Unlock } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { User, WalletData } from '@/lib/types';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { sendNotificationToUser } from '@/services/user';

interface FreezeWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  wallet?: WalletData | null;
}

export function FreezeWalletModal({ isOpen, onClose, user, wallet }: FreezeWalletModalProps) {
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isFrozen = wallet?.isFrozen || false;

    const handleToggleFreeze = async () => {
        if (!user || !reason) return;
        setIsSubmitting(true);

        const walletRef = ref(rtdb, `wallets/${user.uid}`);
        const newFrozenState = !isFrozen;

        try {
            await update(walletRef, { isFrozen: newFrozenState });
            await sendNotificationToUser(
                user.uid,
                `Wallet ${newFrozenState ? 'Frozen' : 'Unfrozen'}`,
                `Your wallet has been ${newFrozenState ? 'frozen' : 'unfrozen'}. Reason: ${reason}`
            );
            toast({
                title: `Wallet ${newFrozenState ? 'Frozen' : 'Unfrozen'}`,
                description: `${user.fullName}'s wallet status has been updated.`,
            });
            onClose();
        } catch(e) {
            toast({
                title: "Error",
                description: "Failed to update wallet status.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setReason('');
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isFrozen ? 'Unfreeze' : 'Freeze'} Wallet</DialogTitle>
                    <DialogDescription>
                        You are about to {isFrozen ? 'unfreeze' : 'freeze'} the wallet of <span className="font-semibold">{user?.fullName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <Alert>
                     {isFrozen ? <Unlock className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
                    <AlertTitle>{isFrozen ? 'Unfreezing Wallet' : 'Freezing Wallet'}</AlertTitle>
                    <AlertDescription>
                        {isFrozen 
                            ? "Unfreezing a wallet will re-enable all transactions (deposits, withdrawals, trades)." 
                            : "Freezing a wallet will prevent all transactions. The user will still be able to log in."
                        }
                    </AlertDescription>
                </Alert>
                <div className="space-y-4 py-2">
                     <div className="space-y-2">
                        <Label htmlFor="reason-freeze">Reason for Action</Label>
                        <Textarea 
                            id="reason-freeze"
                            placeholder="e.g., Investigating chargeback claim."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleToggleFreeze} disabled={!reason || isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : (isFrozen ? <Unlock className="mr-2 h-4 w-4" /> : <Snowflake className="mr-2 h-4 w-4"/>)}
                        Confirm {isFrozen ? 'Unfreeze' : 'Freeze'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
