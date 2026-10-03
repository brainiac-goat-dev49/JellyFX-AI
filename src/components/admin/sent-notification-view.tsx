"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Globe, Users, Clock, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SentNotification {
  id: string;
  title: string;
  message: string;
  target: 'broadcast' | 'select';
  userCount?: number;
  timestamp: string;
}

export function SentNotificationView({ notification }: { notification: SentNotification }) {
  return (
    <Card className="max-w-4xl">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              {notification.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {notification.target === 'broadcast' ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Globe className="h-3.5 w-3.5" /> Broadcast to all platform users
                </span>
              ) : (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                  <Users className="h-3.5 w-3.5" /> Delivered to {notification.userCount} selected recipient(s)
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="rounded-xl border p-6 bg-card prose dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {notification.message}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
