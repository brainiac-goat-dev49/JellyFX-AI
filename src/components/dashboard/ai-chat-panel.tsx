"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
} from "@/components/ui/alert-dialog";
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
    },
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
        userPhotoURL: user.photoURL || null,
      });

      await logActivity(user, 'Sent contact form message', { subject: values.subject });

      toast({ title: "Message Sent!", description: "Thank you for reaching out. Our team will review and reply shortly." });
      form.reset({ ...form.getValues(), subject: '', message: '' });
    } catch (error) {
      console.error("Failed to send message", error);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm bg-background/90 backdrop-blur-sm mt-3 border shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Contact Support</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-3 text-xs">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" className="h-8 text-xs" {...field} disabled={!!user?.email} />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter subject" className="h-8 text-xs" {...field} />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="How can we help?" className="min-h-[70px] text-xs" {...field} />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="pt-0">
            <Button type="submit" size="sm" className="w-full h-8 text-xs" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : "Send Message"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

const AiChatContent = ({ onClearChat }: { onClearChat: () => void }) => {
  const user = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedMessages = localStorage.getItem('capwallet-chat-history');
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('capwallet-chat-history', JSON.stringify(messages));
    } else {
      localStorage.removeItem('capwallet-chat-history');
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const promptText = input.trim();
    setInput("");
    setIsLoading(true);

    const history = newMessages.map((msg) => ({
      role: msg.role,
      content: [{ text: msg.text }],
    }));

    try {
      const aiResponseText = await chat({ message: promptText, history });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponseText,
        feedback: null,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having trouble connecting right now. Please try again or reach out at /help#contact.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    const targetMessage = messages.find((m) => m.id === messageId);
    if (!targetMessage || !user) return;

    if (targetMessage.feedback) {
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

      setMessages(messages.map((m) => (m.id === messageId ? { ...m, feedback } : m)));
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
  }, [messages, isLoading]);

  const renderMessageContent = (text: string) => {
    if (text.includes("```markdown")) {
      const [before, after] = text.split("```markdown");
      return (
        <>
          {before && <p>{before.trim()}</p>}
          <ContactForm />
          {after && <p className="mt-2">{after.trim()}</p>}
        </>
      );
    }

    const linkRegex = /(\/\w+(?:\/\w+)*(?:#\w+)?)/g;
    const parts = text.split(linkRegex);

    return parts.map((part, index) => {
      if (linkRegex.test(part) && part.startsWith('/')) {
        return (
          <Button key={index} asChild variant="link" className="p-0 h-auto inline text-primary font-semibold underline">
            <Link href={part}>{part}</Link>
          </Button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-2" ref={scrollAreaRef as any}>
        <div className="space-y-4 py-2">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-8 space-y-2">
              <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground">Welcome to CapWallet Assistant!</p>
              <p>Ask about surveys, referral rewards, trading, or wallet withdrawals.</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'model' && (
                <Avatar className="h-7 w-7 shrink-0 border border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 max-w-[85%] text-xs leading-relaxed shadow-sm",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted/80 border rounded-bl-none text-foreground'
                )}
              >
                <div className="whitespace-pre-wrap">{renderMessageContent(message.text)}</div>
                {message.role === 'model' && !message.text.includes("```markdown") && (
                  <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-muted-foreground/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleFeedback(message.id, 'like')}
                      disabled={!!message.feedback}
                    >
                      <ThumbsUp className={cn("h-3 w-3", message.feedback === 'like' && "text-primary fill-primary/20")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleFeedback(message.id, 'dislike')}
                      disabled={!!message.feedback}
                    >
                      <ThumbsDown className={cn("h-3 w-3", message.feedback === 'dislike' && "text-destructive fill-destructive/20")} />
                    </Button>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <Avatar className="h-7 w-7 shrink-0 border">
                  <AvatarImage src={user?.photoURL || ''} />
                  <AvatarFallback className="text-[10px]">{user?.fullName?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
              <Avatar className="h-7 w-7 shrink-0 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary"><Bot className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="rounded-2xl px-3.5 py-2.5 bg-muted/80 border rounded-bl-none">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t bg-background">
        <div className="relative flex items-center">
          <Input
            placeholder="Ask Cap anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            className="pr-10 h-10 text-xs"
          />
          <Button
            size="icon"
            className="absolute right-1.5 h-7 w-7 rounded-lg"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export function AiChatPanel() {
  const { openSheets, setSheetOpen } = useDashboardState();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleClearChat = () => {
    localStorage.removeItem('capwallet-chat-history');
    window.location.reload();
  };

  return (
    <>
      {/* Mobile Bottom Sheet */}
      <Sheet open={openSheets.ai} onOpenChange={(isOpen) => setSheetOpen('ai', isOpen)}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="p-4 pb-2 flex-row items-center justify-between border-b">
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5 text-primary" />
                Cap AI Assistant
              </SheetTitle>
              <SheetDescription className="text-xs">
                Ask questions about CapWallet & features
              </SheetDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your stored conversation history.
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
          <div className="flex-1 overflow-hidden">
            <AiChatContent onClearChat={handleClearChat} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Floating Action Trigger + Popover */}
      <div className="fixed bottom-6 right-6 z-50 hidden md:block">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              className="rounded-full h-14 w-14 shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground transition-transform hover:scale-105"
              title="CapWallet AI Assistant"
            >
              <Bot className="h-7 w-7" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[380px] h-[520px] flex flex-col p-0 shadow-2xl mr-2 mb-2 rounded-2xl overflow-hidden border" align="end" side="top">
            <div className="p-3.5 flex justify-between items-center border-b bg-muted/40">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" /> Cap AI Assistant
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Online & ready to assist
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Clear history">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset your local conversation with the AI.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearChat}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="flex-1 overflow-hidden">
              <AiChatContent onClearChat={handleClearChat} />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
