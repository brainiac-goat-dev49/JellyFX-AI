"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, MessageSquare, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { rtdb, auth } from '@/lib/firebase';
import { ref, push, set } from 'firebase/database';
import { formatDistanceToNow } from 'date-fns';

interface ContactMessage {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhotoURL?: string;
  subject: string;
  message: string;
  category?: string;
  timestamp: string;
  replies?: {
    [key: string]: {
      adminId: string;
      message: string;
      timestamp: string;
    };
  };
}

export function ChatView({ message }: { message: ContactMessage }) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSending(true);

    try {
      const replyRef = push(ref(rtdb, `contactMessages/${message.id}/replies`));
      const timestamp = new Date().toISOString();
      await set(replyRef, {
        adminId: auth.currentUser?.uid || 'admin',
        message: replyText.trim(),
        timestamp,
      });

      const userNotifRef = push(ref(rtdb, `notifications/${message.userId}`));
      await set(userNotifRef, {
        id: userNotifRef.key,
        title: `@support.alert: Reply to "${message.subject}"`,
        content: replyText.trim(),
        timestamp,
        read: false,
      });

      toast({ title: "Reply Sent", description: "Your response has been sent to the user." });
      setReplyText('');
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast({ title: "Error", description: "Could not send reply.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const repliesList = message.replies
    ? Object.keys(message.replies).map((key) => ({
        id: key,
        ...message.replies![key],
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={message.userPhotoURL} alt={message.userFullName} />
                <AvatarFallback>{message.userFullName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{message.subject}</CardTitle>
                <CardDescription>
                  From {message.userFullName} ({message.userEmail})
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="rounded-xl border p-4 bg-muted/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-primary">
              <span>{message.userFullName}</span>
              <span className="text-muted-foreground">{new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{message.message}</p>
          </div>

          {repliesList.map((reply) => (
            <div key={reply.id} className="rounded-xl border border-primary/20 p-4 bg-primary/5 space-y-2 ml-4">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span>Support Administrator</span>
                <span className="text-muted-foreground">{new Date(reply.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{reply.message}</p>
            </div>
          ))}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 p-6 pt-0 border-t bg-card">
          <div className="w-full space-y-2 pt-4">
            <Textarea
              placeholder="Type your reply to this inquiry..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={handleSendReply} disabled={isSending || !replyText.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Response
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
