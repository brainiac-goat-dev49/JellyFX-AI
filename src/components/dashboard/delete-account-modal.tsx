"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const user = useUser();
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    if (!user || confirmation !== 'DELETE') return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }
      toast({ title: "Account Deleted", description: "Your account has been deleted permanently." });
      onClose();
      router.push('/login');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Action Required",
        description: error.message || "Failed to delete account. You may need to re-authenticate.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Account</DialogTitle>
          <DialogDescription>
            This action cannot be undone. All your data will be permanently removed.
            Type <span className="font-bold text-foreground">DELETE</span> below to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type DELETE"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmation !== 'DELETE' || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
