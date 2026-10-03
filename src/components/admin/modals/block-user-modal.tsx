
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldOff } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { User } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendNotificationToUser } from '@/services/user';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function BlockUserModal({ isOpen, onClose, user }: BlockUserModalProps) {
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBlockUser = async () => {
        if (!user || !reason) return;
        setIsSubmitting(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                status: 'blocked',
                blockReason: reason,
                suspensionLiftDate: null,
                suspensionReason: null
            });

            await sendNotificationToUser(
                user.uid, 
                "Account Blocked",
                `Your account has been blocked. Reason: ${reason}. Please contact support for more information.`
            );
            
            toast({
                title: "User Blocked",
                description: `${user.fullName} has been blocked.`,
            });
            onClose();
        } catch (error) {
            console.error("Failed to block user:", error);
            toast({
                title: "Error",
                description: "Could not block the user.",
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
                    <DialogTitle>Block User</DialogTitle>
                    <DialogDescription>
                        You are about to block <span className="font-semibold">{user?.fullName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <Alert variant="destructive">
                    <ShieldOff className="h-4 w-4"/>
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                        Blocking this user will prevent them from accessing their account and all site features entirely. This action can be reversed later by setting their status to &apos;active&apos;.
                    </AlertDescription>
                </Alert>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Blocking</Label>
                        <Textarea 
                            id="reason"
                            placeholder="e.g., Violation of terms of service."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={handleBlockUser} disabled={!reason || isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <ShieldOff className="mr-2 h-4 w-4"/>}
                        Confirm Block
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    