
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserX } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { User } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendNotificationToUser } from '@/services/user';

interface SuspendAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function SuspendAccountModal({ isOpen, onClose, user }: SuspendAccountModalProps) {
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('7'); // Default to 7 days
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSuspend = async () => {
        if (!user || !reason || !duration) return;
        setIsSubmitting(true);

        const suspensionLiftDate = new Date();
        suspensionLiftDate.setDate(suspensionLiftDate.getDate() + parseInt(duration, 10));

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                status: 'suspended',
                suspensionReason: reason,
                suspensionLiftDate: suspensionLiftDate.toISOString(),
            });

             await sendNotificationToUser(
                user.uid, 
                "Account Suspended",
                `Your account has been suspended for ${duration} days. Reason: ${reason}.`
            );

            toast({
                title: "Account Suspended",
                description: `${user.fullName}'s account has been suspended for ${duration} days.`,
            });
            onClose();
        } catch (error) {
            console.error("Failed to suspend user:", error);
            toast({
                title: "Error",
                description: "Could not suspend the account.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setReason('');
            setDuration('7');
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Suspend Account</DialogTitle>
                    <DialogDescription>
                        Temporarily suspend <span className="font-semibold">{user?.fullName}</span>&apos;s account.
                    </DialogDescription>
                </DialogHeader>
                <Alert>
                    <UserX className="h-4 w-4"/>
                    <AlertTitle>Notice</AlertTitle>
                    <AlertDescription>
                        Suspending an account will temporarily disable login access. The suspension will automatically lift after the specified duration.
                    </AlertDescription>
                </Alert>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="duration">Suspension Duration (days)</Label>
                        <Input 
                            id="duration"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reason-suspend">Reason for Suspension</Label>
                        <Textarea 
                            id="reason-suspend"
                            placeholder="e.g., Suspicious activity detected."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSuspend} disabled={!reason || !duration || isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <UserX className="mr-2 h-4 w-4"/>}
                        Confirm Suspension
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    