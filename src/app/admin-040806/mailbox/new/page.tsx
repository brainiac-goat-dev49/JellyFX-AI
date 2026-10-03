
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { ArrowLeft, Send, Loader2, Calendar as CalendarIcon, Eye } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendAdminNotification } from '@/services/user';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const senderAliases = [
    { value: '@system.alert', label: 'System Alert' },
    { value: '@surveys.alert', label: 'Survey Alert' },
    { value: '@referrals.alert', label: 'Referral Alert' },
    { value: '@support.alert', label: 'Support Alert' },
    { value: '@team.alert', label: 'Team Alert' },
    { value: '@recoveraccount.alert', label: 'Account Recovery Alert' },
    { value: '@security.alert', label: 'Security Alert' },
    { value: '@transaction.alert', label: 'Transaction Alert' },
    { value: 'custom', label: 'Custom' }
];

const formSchema = z.object({
    target: z.enum(['broadcast', 'select']),
    users: z.array(z.string()).optional(),
    senderAlias: z.string().min(1),
    customSender: z.string().optional(),
    title: z.string().min(1, 'Title is required.'),
    message: z.string().min(1, 'Message is required.'),
    schedule: z.boolean(),
    scheduledAtDate: z.date().optional(),
    scheduledAtTime: z.string().optional(),
}).refine(data => data.senderAlias !== 'custom' || (data.customSender && data.customSender.trim().length > 0), {
    message: "Custom sender name is required.",
    path: ["customSender"],
}).refine(data => data.target !== 'select' || (data.users && data.users.length > 0), {
    message: "You must select at least one user.",
    path: ["users"],
});

export default function NewNotificationPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [userOptions, setUserOptions] = useState<Option[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            target: 'broadcast',
            users: [],
            senderAlias: '@system.alert',
            title: '',
            message: '',
            schedule: false,
            scheduledAtTime: '09:00',
        },
    });

    const watchedSenderAlias = form.watch('senderAlias');
    const watchedTarget = form.watch('target');
    const watchedSchedule = form.watch('schedule');
    const watchedMessage = form.watch('message');
    const watchedTitle = form.watch('title');
    
    useEffect(() => {
        async function fetchUsers() {
            setLoadingUsers(true);
            try {
                const usersCollectionRef = collection(db, 'users');
                const usersSnapshot = await getDocs(usersCollectionRef);
                const options = usersSnapshot.docs.map(doc => ({
                    value: doc.id,
                    label: `${doc.data().fullName} (@${doc.data().username})`,
                }));
                setUserOptions(options);
            } catch (error) {
                console.error("Failed to fetch users:", error);
                toast({ title: "Error", description: "Could not load user list.", variant: "destructive" });
            } finally {
                setLoadingUsers(false);
            }
        }
        fetchUsers();
    }, [toast]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const sender = values.senderAlias === 'custom' ? values.customSender! : values.senderAlias;
            
            if (values.schedule && values.scheduledAtDate) {
                 const scheduledTime = values.scheduledAtTime?.split(':');
                 values.scheduledAtDate.setHours(Number(scheduledTime?.[0] || 0), Number(scheduledTime?.[1] || 0));
                 console.log("Scheduled for:", values.scheduledAtDate.toISOString());
            }

            await sendAdminNotification({
                target: values.target,
                users: values.users || [],
                senderAlias: values.senderAlias,
                customSender: values.customSender,
                title: values.title,
                message: values.message,
                schedule: values.schedule,
                scheduledAtDate: values.scheduledAtDate,
                scheduledAtTime: values.scheduledAtTime,
            });

            toast({
                title: "Notification Sent!",
                description: "Your message has been delivered to the selected users.",
            });
            form.reset();
            router.push('/admin-040806/mailbox');

        } catch (error: any) {
            toast({
                title: "Failed to Send",
                description: error.message || "An error occurred while sending the notification.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin-040806/mailbox"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">New Notification</h1>
                    <p className="text-muted-foreground">Compose and send a message to your users.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <FormField
                                control={form.control}
                                name="target"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Target Audience</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="broadcast" /></FormControl>
                                                    <FormLabel className="font-normal">Broadcast to all users</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="select" /></FormControl>
                                                    <FormLabel className="font-normal">Select specific users</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {watchedTarget === 'select' && (
                                <FormField
                                    control={form.control}
                                    name="users"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Users</FormLabel>
                                            <MultiSelect
                                                options={userOptions}
                                                selected={field.value || []}
                                                onChange={field.onChange}
                                                placeholder={loadingUsers ? "Loading users..." : "Select users..."}
                                                className="w-full"
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="senderAlias"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sender Name</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a sender" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {senderAliases.map(alias => (
                                                        <SelectItem key={alias.value} value={alias.value}>{alias.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {watchedSenderAlias === 'custom' && (
                                    <FormField
                                        control={form.control}
                                        name="customSender"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Custom Sender Name</FormLabel>
                                                <FormControl><Input placeholder="@your.alert" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>


                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl><Input placeholder="Important Announcement" {...field} /></FormControl>
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
                                            <MarkdownEditor 
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="space-y-4">
                                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Schedule for Later</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Send this notification at a future date and time.
                                        </p>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="schedule"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {watchedSchedule && (
                                    <div className="grid md:grid-cols-2 gap-4 rounded-lg border p-4">
                                        <FormField
                                            control={form.control}
                                            name="scheduledAtDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full justify-start text-left font-normal",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <CalendarComponent
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                disabled={(date) => date < new Date()}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="scheduledAtTime"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Time</FormLabel>
                                                    <FormControl>
                                                        <Input type="time" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                            </div>


                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}>
                                    <Eye className="mr-2 h-4 w-4" /> Preview
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                                    Send Notification
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <SheetContent className="w-full sm:max-w-lg p-0">
                     <SheetHeader className="p-6 pb-2">
                        <SheetTitle>Notification Preview</SheetTitle>
                     </SheetHeader>
                     <div className="p-6 pt-0 space-y-4">
                        <h3 className="text-xl font-bold">{watchedTitle}</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {watchedMessage}
                            </ReactMarkdown>
                        </div>
                     </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
