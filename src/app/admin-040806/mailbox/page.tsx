
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Inbox, Loader2, ArrowLeft, MoreHorizontal, Eye, Trash2, Users, Globe } from 'lucide-react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, remove } from 'firebase/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ChatView } from '@/components/admin/chat-view';
import Link from 'next/link';
import { SentNotificationView } from '@/components/admin/sent-notification-view';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';


export interface ContactMessage {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhotoURL?: string;
  subject: string;
  message: string;
  category: string;
  timestamp: string;
  replies?: {
      [key: string]: {
          adminId: string;
          message: string;
          timestamp: string;
      }
  }
}

export interface SentNotification {
    id: string;
    title: string;
    message: string;
    target: 'broadcast' | 'select';
    userCount?: number;
    timestamp: string;
}

export default function MailboxPage() {
    const { toast } = useToast();
    const [incomingMessages, setIncomingMessages] = useState<ContactMessage[]>([]);
    const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
    const [loading, setLoading] = useState({ inbox: true, sent: true });
    const [selectedItem, setSelectedItem] = useState<ContactMessage | SentNotification | null>(null);
    const [viewType, setViewType] = useState<'inbox' | 'sent' | null>(null);
    const [itemToDelete, setItemToDelete] = useState<SentNotification | null>(null);


    useEffect(() => {
        const messagesQuery = query(ref(rtdb, 'contactMessages'), orderByChild('timestamp'));
        const unsubscribeInbox = onValue(messagesQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const messages: ContactMessage[] = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).reverse(); // Newest first
                setIncomingMessages(messages);
            } else {
                setIncomingMessages([]);
            }
            setLoading(prev => ({...prev, inbox: false}));
        });
        
        const sentQuery = query(ref(rtdb, 'admin/sentNotifications'), orderByChild('timestamp'));
        const unsubscribeSent = onValue(sentQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const notifications: SentNotification[] = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).reverse();
                setSentNotifications(notifications);
            } else {
                setSentNotifications([]);
            }
            setLoading(prev => ({...prev, sent: false}));
        });

        return () => {
            unsubscribeInbox();
            unsubscribeSent();
        };
    }, []);
    
    const handleDeleteSentNotification = async () => {
        if (!itemToDelete) return;
        const notificationRef = ref(rtdb, `admin/sentNotifications/${itemToDelete.id}`);
        try {
            await remove(notificationRef);
            toast({ title: "Notification Deleted", description: "The notification has been removed from your sent log." });
            setItemToDelete(null);
        } catch (error) {
            console.error("Failed to delete sent notification:", error);
            toast({ title: "Error", description: "Could not delete the notification.", variant: "destructive" });
        }
    };


    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }
    
    const renderTargetDescription = (item: SentNotification) => {
        if (item.target === 'broadcast') {
            return <p className="text-sm text-muted-foreground truncate flex items-center gap-1"><Globe className="h-3 w-3" /> Broadcast to all users</p>
        }
        return <p className="text-sm text-muted-foreground truncate flex items-center gap-1"><Users className="h-3 w-3" /> Sent to {item.userCount} user{item.userCount !== 1 ? 's' : ''}</p>
    }

    if (selectedItem) {
        return (
            <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
                 <Button variant="ghost" onClick={() => setSelectedItem(null)} className="self-start mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Mailbox
                </Button>
                {viewType === 'inbox' && <ChatView message={selectedItem as ContactMessage} />}
                {viewType === 'sent' && <SentNotificationView notification={selectedItem as SentNotification} />}
            </div>
        )
    }

    return (
    <>
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mailbox</h1>
                    <p className="text-muted-foreground">Communicate with your users and manage notifications.</p>
                </div>
                <Button asChild>
                    <Link href="/admin-040806/mailbox/new">
                        <Send className="mr-2 h-4 w-4" /> Send New Notification
                    </Link>
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Tabs defaultValue="inbox">
                        <TabsList className="p-2 w-full justify-start rounded-b-none">
                            <TabsTrigger value="inbox"><Inbox className="mr-2 h-4 w-4"/> Inbox</TabsTrigger>
                            <TabsTrigger value="sent"><Send className="mr-2 h-4 w-4"/>Sent</TabsTrigger>
                        </TabsList>
                        
                        {/* Inbox Content */}
                        <TabsContent value="inbox" className="p-4 md:p-6">
                             {loading.inbox ? (
                                <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                             ) : incomingMessages.length > 0 ? (
                                <div className="space-y-4">
                                    {incomingMessages.map(msg => (
                                        <div key={msg.id} onClick={() => { setSelectedItem(msg); setViewType('inbox'); }} className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={msg.userPhotoURL} alt={msg.userFullName} />
                                                <AvatarFallback>{getInitials(msg.userFullName)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 truncate">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold truncate">{msg.userFullName}</p>
                                                    <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</p>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">{msg.subject}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             ) : (
                                <div className="text-center text-muted-foreground p-8">
                                    <Inbox className="mx-auto h-12 w-12" />
                                    <p className="mt-4">Your inbox is empty.</p>
                                </div>
                             )}
                        </TabsContent>

                        {/* Sent Content */}
                         <TabsContent value="sent" className="p-4 md:p-6">
                             {loading.sent ? (
                                <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                             ) : sentNotifications.length > 0 ? (
                                <div className="space-y-4">
                                    {sentNotifications.map(item => (
                                        <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border">
                                            <div className="flex-1 truncate">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold truncate">{item.title}</p>
                                                     <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</p>
                                                </div>
                                                {renderTargetDescription(item)}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => { setSelectedItem(item); setViewType('sent'); }}>
                                                        <Eye className="mr-2 h-4 w-4" /> View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onSelect={() => setItemToDelete(item)}>
                                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))}
                                </div>
                             ) : (
                                <div className="text-center text-muted-foreground p-8">
                                    <Send className="mx-auto h-12 w-12" />
                                    <p className="mt-4">You have not sent any notifications.</p>
                                </div>
                             )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>

        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this notification from your sent log. This does not un-send it from users&apos; inboxes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSentNotification}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
    );
}

