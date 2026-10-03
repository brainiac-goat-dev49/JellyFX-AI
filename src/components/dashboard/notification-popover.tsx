"use client";

import React, { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, update, remove } from 'firebase/database';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { NotificationItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NotificationPopoverProps {
  children: React.ReactNode;
  onOpenChange?: () => boolean | void;
}

export function NotificationPopover({ children, onOpenChange }: NotificationPopoverProps) {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const notifRef = ref(rtdb, `notifications/${user.uid}`);
    const unsubscribe = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: NotificationItem[] = Object.keys(val).map((key) => ({
          id: key,
          ...val[key],
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(list);
      } else {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && onOpenChange) {
      const allowed = onOpenChange();
      if (allowed === false) return;
    }
    setOpen(newOpen);
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const updates: Record<string, any> = {};
    notifications.forEach((n) => {
      if (!n.read) {
        updates[`notifications/${user.uid}/${n.id}/read`] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb), updates);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    await remove(ref(rtdb, `notifications/${user.uid}`));
  };

  const markSingleAsRead = async (id: string) => {
    if (!user) return;
    await update(ref(rtdb, `notifications/${user.uid}/${id}`), { read: true });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={markAllAsRead}
              title="Mark all as read"
            >
              <Check className="h-3 w-3 mr-1" /> Read all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-destructive"
              onClick={clearAllNotifications}
              title="Clear all"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markSingleAsRead(n.id)}
                  className={cn(
                    "p-3.5 text-xs transition-colors hover:bg-muted/50 cursor-pointer space-y-1.5",
                    !n.read && "bg-primary/5 font-medium"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {n.timestamp ? formatDistanceToNow(new Date(n.timestamp), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  {n.data?.button && (
                    <Button asChild size="sm" variant="secondary" className="h-6 text-[10px] mt-1">
                      <Link href={n.data.button.link}>
                        {n.data.button.text} <ExternalLink className="h-2.5 w-2.5 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
