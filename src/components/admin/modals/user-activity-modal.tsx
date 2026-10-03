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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Activity, Clock } from 'lucide-react';
import { User } from '@/lib/types';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { formatDistanceToNow } from 'date-fns';

interface UserActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

interface ActivityLogItem {
  id: string;
  activity: string;
  timestamp: string;
  details?: any;
}

export function UserActivityModal({ isOpen, onClose, user }: UserActivityModalProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isOpen) {
      setLogs([]);
      return;
    }

    setLoading(true);
    const userLogsRef = query(ref(rtdb, `users/${user.uid}/activityLogs`), orderByChild('timestamp'));
    const unsubscribe = onValue(userLogsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: ActivityLogItem[] = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        })).reverse();
        setLogs(list);
      } else {
        setLogs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity Log: {user?.fullName}
          </DialogTitle>
          <DialogDescription>
            Historical event records and system activity for @{user?.username} ({user?.email})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-2">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground text-sm">
              <Activity className="h-8 w-8 mb-2 opacity-30" />
              <p>No activity logs recorded for this user yet.</p>
            </div>
          ) : (
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{log.activity}</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    {log.details && (
                      <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded font-mono break-all">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
