
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { User } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendNotificationToUser } from '@/services/user';

interface UnblockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function UnblockUserModal({ isOpen, onClose, user }: UnblockUserModalProps) {
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUnblockUser = async () => {
        if (!user || !reason) return;
        setIsSubmitting(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                status: 'active',
                blockReason: null,
            });

            await sendNotificationToUser(
                user.uid, 
                "Account Restored",
                `Your account has been unblocked and restored. Reason: ${reason}.`
            );
            
            toast({
                title: "User Unblocked",
                description: `${user.fullName}'s account has been restored.`,
            });
            onClose();
        } catch (error) {
            console.error("Failed to unblock user:", error);
            toast({
                title: "Error",
                description: "Could not unblock the user.",
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
                    <DialogTitle>Unblock User</DialogTitle>
                    <DialogDescription>
                        You are about to restore access for <span className="font-semibold">{user?.fullName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <Alert variant="default" className="border-green-500/50 text-green-700 dark:border-green-500 [&>svg]:text-green-700">
                    <CheckCircle className="h-4 w-4"/>
                    <AlertTitle>Restoring Access</AlertTitle>
                    <AlertDescription>
                        Unblocking this user will set their status to &apos;active&apos; and allow them to log in and use the site normally again.
                    </AlertDescription>
                </Alert>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="reason-unblock">Reason for Unblocking</Label>
                        <Textarea 
                            id="reason-unblock"
                            placeholder="e.g., Appeal approved, issue resolved."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="default" onClick={handleUnblockUser} disabled={!reason || isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Confirm Unblock
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
