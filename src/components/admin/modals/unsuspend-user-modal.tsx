
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

interface UnsuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function UnsuspendUserModal({ isOpen, onClose, user }: UnsuspendUserModalProps) {
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUnsuspend = async () => {
        if (!user || !reason) return;
        setIsSubmitting(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                status: 'active',
                suspensionReason: null,
                suspensionLiftDate: null,
            });

             await sendNotificationToUser(
                user.uid, 
                "Suspension Lifted",
                `Your account suspension has been lifted early. Reason: ${reason}. You may now log in.`
            );

            toast({
                title: "Suspension Lifted",
                description: `${user.fullName}'s account has been reactivated.`,
            });
            onClose();
        } catch (error) {
            console.error("Failed to lift suspension:", error);
            toast({
                title: "Error",
                description: "Could not lift the suspension.",
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
                    <DialogTitle>Lift Suspension</DialogTitle>
                    <DialogDescription>
                        You are about to lift the suspension for <span className="font-semibold">{user?.fullName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <Alert>
                    <CheckCircle className="h-4 w-4"/>
                    <AlertTitle>Notice</AlertTitle>
                    <AlertDescription>
                       Lifting a suspension will immediately restore the user&apos;s access to their account, regardless of the original duration.
                    </AlertDescription>
                </Alert>
                <div className="space-y-4 py-2">
                     <div className="space-y-2">
                        <Label htmlFor="reason-unsuspend">Reason for Lifting</Label>
                        <Textarea 
                            id="reason-unsuspend"
                            placeholder="e.g., User has completed required verification."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleUnsuspend} disabled={!reason || isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Confirm and Lift Suspension
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
