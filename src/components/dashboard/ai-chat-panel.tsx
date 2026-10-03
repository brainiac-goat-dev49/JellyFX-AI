
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
import { useDashboardState } from "@/hooks/use-dashboard-state";
import { Bot, ThumbsUp, ThumbsDown, Send, Sparkles, User as UserIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { useState, useRef, useEffect } from "react";
import { chat } from "@/ai/flows/chat-flow";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { rtdb } from "@/lib/firebase";
import { ref, push, set } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { logActivity } from "@/services/user";


interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    feedback?: 'like' | 'dislike' | null;
}

const contactFormSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1, "Subject is required."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});


const ContactForm = () => {
    const user = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof contactFormSchema>>({
        resolver: zodResolver(contactFormSchema),
        defaultValues: {
            email: user?.email || '',
            subject: '',
            message: '',
        }
    });

    async function onSubmit(values: z.infer<typeof contactFormSchema>) {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to submit a message.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const messageRef = push(ref(rtdb, 'contactMessages'));
            await set(messageRef, {
                ...values,
                userId: user.uid,
                timestamp: new Date().toISOString(),
                userFullName: user.fullName,
                userEmail: user.email,
                userPhotoURL: user.photoURL,
            });

            await logActivity(user, 'Sent contact form message', { subject: values.subject });

            toast({ title: "Message Sent!", description: "Thank you for your feedback. Our team will get back to you shortly." });
            form.reset({ ...form.getValues(), subject: '', message: '' });
        } catch (error) {
            console.error("Failed to send message", error);
            toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full max-w-sm bg-background/80 backdrop-blur-sm mt-2">
            <CardHeader>
                <CardTitle>Contact Support</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="your@email.com" {...field} disabled={!!user?.email} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter subject" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Message</FormLabel>
                                    <FormControl>
                                        <Textarea id="message" placeholder="How can we help?" className="min-h-[100px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Send Message"}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}

const AiChatContent = ({ onClearChat }: { onClearChat: () => void }) => {
    const user = useUser();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Load messages from localStorage on mount
    useEffect(() => {
        const storedMessages = localStorage.getItem('capwallet-chat-history');
        if (storedMessages) {
            setMessages(JSON.parse(storedMessages));
        }
    }, []);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        if(messages.length > 0) {
            localStorage.setItem('capwallet-chat-history', JSON.stringify(messages));
        } else {
            localStorage.removeItem('capwallet-chat-history');
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        // Prepare history for the AI
        const history = newMessages.map(msg => ({
            role: msg.role,
            content: [{ text: msg.text }]
        }));

        try {
            const aiResponseText = await chat({ message: input, history });

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: aiResponseText,
                feedback: null, // Initialize feedback state
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Sorry, I'm having trouble connecting right now. Please try again later.",
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
        const targetMessage = messages.find(m => m.id === messageId);
        if (!targetMessage || !user) return;
        
        // Prevent duplicate feedback
        if(targetMessage.feedback) {
            toast({ title: 'Feedback already submitted.' });
            return;
        }

        try {
            const feedbackRef = push(ref(rtdb, 'aiFeedback'));
            await set(feedbackRef, {
                userId: user.uid,
                messageId: messageId,
                messageText: targetMessage.text,
                feedback: feedback,
                timestamp: new Date().toISOString(),
            });

            // Update UI state
            setMessages(messages.map(m => m.id === messageId ? { ...m, feedback } : m));
            toast({ title: "Thank you for your feedback!" });

        } catch (error) {
            console.error("Failed to submit feedback", error);
            toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" });
        }
    };
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);
    
    const renderMessageContent = (text: string) => {
        if (text.includes("```markdown")) {
            const [before, after] = text.split("```markdown");
            return (
                <>
                    {before && <p>{before.trim()}</p>}
                    <ContactForm />
                    {after && <p className="mt-2">{after.trim()}</p>}
                </>
            )
        }
    
        const linkRegex = /(\/\w+(?:\/\w+)*#?\w*)/g;
        const parts = text.split(linkRegex);
    
        return parts.map((part, index) => {
            if (linkRegex.test(part) && part.startsWith('/')) {
                return <Button key={index} asChild variant="link" className="p-0 h-auto inline"><Link href={part}>{part}</Link></Button>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 -mx-6 px-6" ref={scrollAreaRef as any}>
                <div className="space-y-6 py-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm pt-8">
                            <Sparkles className="mx-auto h-8 w-8 mb-2"/>
                            <p>Ask me anything about CapWallet!</p>
                        </div>
                    )}
                    {messages.map(message => (
                        <div key={message.id} className={cn("flex items-end gap-2", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                            {message.role === 'model' && <Avatar className="h-8 w-8"><AvatarFallback><Bot/></AvatarFallback></Avatar>}
                            <div className={cn("rounded-lg px-4 py-3 max-w-[90%] animate-in fade-in-25", 
                                message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                            )}>
                               <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageContent(message.text)}</div>
                               {message.role === 'model' && !message.text.includes("```markdown") && (
                                   <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-muted-foreground/20">
                                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback(message.id, 'like')} disabled={!!message.feedback}>
                                            <ThumbsUp className={cn("h-4 w-4", message.feedback === 'like' && "text-primary fill-primary/20")} />
                                       </Button>
                                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleFeedback(message.id, 'dislike')} disabled={!!message.feedback}>
                                           <ThumbsDown className={cn("h-4 w-4", message.feedback === 'dislike' && "text-destructive fill-destructive/20")} />
                                       </Button>
                                   </div>
                               )}
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.photoURL || ''} />
                                    <AvatarFallback><UserIcon /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-2 justify-start">
                             <Avatar className="h-8 w-8"><AvatarFallback><Bot/></AvatarFallback></Avatar>
                            <div className="rounded-lg px-4 py-3 bg-muted rounded-bl-none animate-pulse">
                                <div className="h-2 w-4 rounded-full bg-muted-foreground/30"/>
                            </div>
                         </div>
                    )}
                </div>
            </ScrollArea>
            <div className="py-4 border-t">
                 <div className="relative">
                    <Input 
                        placeholder="Ask anything..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        disabled={isLoading}
                        className="pr-12 h-12"
                    />
                    <Button 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9" 
                        onClick={handleSend} 
                        disabled={isLoading || !input.trim()}
                    >
                        <Send className="h-5 w-5"/>
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function AiChatPanel() {
  const { openSheets, setSheetOpen } = useDashboardState();
  
  const handleClearChat = () => {
    localStorage.removeItem('capwallet-chat-history');
    // This will cause the chat component to re-render with an empty message array
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <>
        {/* Mobile Sheet is triggered from the header so it does not need a visual trigger here */}
        <Sheet open={openSheets.ai} onOpenChange={(isOpen) => setSheetOpen('ai', isOpen)}>
            <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
                <SheetHeader className="p-6 pb-0 flex-row items-center justify-between">
                  <div>
                    <SheetTitle className="flex items-center gap-2">
                        <Bot />
                        AI Assistant
                    </SheetTitle>
                    <SheetDescription>
                        How can I help you today?
                    </SheetDescription>
                  </div>
                   <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-destructive"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete your conversation with the AI. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <SheetClose asChild>
                                    <AlertDialogAction onClick={handleClearChat}>Clear</AlertDialogAction>
                                </SheetClose>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </SheetHeader>
                <div className="flex-1 px-6 overflow-hidden">
                    <AiChatContent onClearChat={handleClearChat} />
                </div>
            </SheetContent>
        </Sheet>
        
        {/* Desktop Popover */}
        <Popover>
            <PopoverTrigger asChild>
                <Button size="icon" className="rounded-full h-14 w-14 shadow-lg animate-in fade-in zoom-in-50 hidden md:flex">
                    <Bot className="h-7 w-7" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 h-[60vh] mr-4 flex flex-col p-0" align="end">
                <div className="p-4 pb-2 flex justify-between items-center border-b">
                   <div>
                        <h4 className="font-medium leading-none flex items-center gap-2"><Bot/> AI Assistant</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            How can I help you today?
                        </p>
                   </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-destructive"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete your conversation with the AI. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearChat}>Clear</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <div className="flex-1 px-6 overflow-hidden">
                    <AiChatContent onClearChat={handleClearChat} />
                </div>
            </PopoverContent>
        </Popover>
    </>
  );
}
