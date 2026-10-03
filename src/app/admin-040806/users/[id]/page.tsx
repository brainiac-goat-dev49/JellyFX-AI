"use client";

import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Wallet, Send, User as UserIcon, ShieldOff, UserX, BarChart2, Users, Snowflake, Gift, CheckCircle, AlertTriangle, Check, X, Mail, Phone, Camera, ImageIcon, Trash2, LogIn } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, rtdb, auth } from '@/lib/firebase';
import { User as UserType, WalletData as WalletDataType } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { updateUserBalances, sendNotificationToUser, giveBonus, handlePendingEarnings, sendPasswordReset } from '@/services/user';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BlockUserModal } from '@/components/admin/modals/block-user-modal';
import { SuspendAccountModal } from '@/components/admin/modals/suspend-account-modal';
import { FreezeWalletModal } from '@/components/admin/modals/freeze-wallet-modal';
import { UnblockUserModal } from '@/components/admin/modals/unblock-user-modal';
import { UnsuspendUserModal } from '@/components/admin/modals/unsuspend-user-modal';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import axios from 'axios';
import { impersonateUser } from '@/ai/flows/impersonate-user-flow';


interface BalanceUpdateFormData extends Omit<WalletDataType, 'isFrozen'> {
    reason: string;
}

interface BonusFormData {
    amount: number;
    reason: string;
}

interface ReferralStats {
    totalReferrals: number;
    activeUsers: number;
    thisMonth: number;
    directReferrals: number;
    teamSize: number;
    indirectReferrals: number;
    teamEarnings: number;
}

interface SurveyHistoryItem {
    id: string;
    title: string;
    status: string;
}


export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const userId = params.id as string;

    const [user, setUser] = useState<UserType | null>(null);
    const [wallet, setWallet] = useState<WalletDataType | null>(null);
    const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
    const [surveyHistory, setSurveyHistory] = useState<SurveyHistoryItem[]>([]);
    const [loading, setLoading] = useState({ user: true, wallet: true, stats: true, history: true });

    // Modal states
    const [isBlockModalOpen, setBlockModalOpen] = useState(false);
    const [isSuspendModalOpen, setSuspendModalOpen] = useState(false);
    const [isFreezeModalOpen, setFreezeWalletModalOpen] = useState(false);
    const [isUnblockModalOpen, setUnblockModalOpen] = useState(false);
    const [isUnsuspendModalOpen, setUnsuspendModalOpen] = useState(false);
    
    const [isUpdatingBalances, setIsUpdatingBalances] = useState(false);
    const [isSendingNotif, setIsSendingNotif] = useState(false);
    const [isGivingBonus, setIsGivingBonus] = useState(false);
    const [isProcessingPending, setIsProcessingPending] = useState(false);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const { control: balanceControl, handleSubmit: handleBalanceSubmit, reset: resetBalances, register: balanceRegister } = useForm<BalanceUpdateFormData>();
    const { register: notifRegister, handleSubmit: handleNotifSubmit, reset: resetNotifForm } = useForm<{ title: string; message: string }>();
    const { register: bonusRegister, handleSubmit: handleBonusSubmit, reset: resetBonusForm } = useForm<BonusFormData>();

    useEffect(() => {
        if (!userId) return;

        const userDocRef = doc(db, 'users', userId);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Convert Firestore Timestamps to serializable format (ISO string) right away
                const userData: UserType = {
                    uid: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                    // Handle potential future Timestamps here as well
                } as UserType;
                setUser(userData);
            } else {
                setUser(null);
            }
            setLoading(prev => ({...prev, user: false}));
        });

        const walletRef = ref(rtdb, `wallets/${userId}`);
        const unsubscribeWallet = onValue(walletRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const walletData = {
                    balance: data.balance || 0,
                    pendingBalance: data.pendingBalance || 0,
                    surveyBalance: data.surveyBalance || 0,
                    referralBalance: data.referralBalance || 0,
                    bonusBalance: data.bonusBalance || 0,
                    isFrozen: data.isFrozen || false,
                };
                setWallet(walletData);
                resetBalances(walletData);
            } else {
                setWallet(null);
            }
            setLoading(prev => ({...prev, wallet: false}));
        });

        const statsRef = ref(rtdb, `referralStats/${userId}`);
        const unsubscribeStats = onValue(statsRef, (snapshot) => {
            setReferralStats(snapshot.val());
            setLoading(prev => ({...prev, stats: false}));
        });
        
        const historyRef = ref(rtdb, `users/${userId}/surveyHistory`);
        const unsubscribeHistory = onValue(historyRef, (snapshot) => {
            const data = snapshot.val();
            if(data) {
                setSurveyHistory(Object.values(data));
            } else {
                setSurveyHistory([]);
            }
            setLoading(prev => ({...prev, history: false}));
        });


        return () => {
            unsubscribeUser();
            unsubscribeWallet();
            unsubscribeStats();
            unsubscribeHistory();
        };

    }, [userId, resetBalances]);

    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
    };
    
    const onBalanceSubmit = async (data: BalanceUpdateFormData) => {
        setIsUpdatingBalances(true);
        const { reason, ...balancesToUpdate } = data;

        const numericBalances = {
            balance: Number(balancesToUpdate.balance),
            pendingBalance: Number(balancesToUpdate.pendingBalance),
            surveyBalance: Number(balancesToUpdate.surveyBalance),
            referralBalance: Number(balancesToUpdate.referralBalance),
            bonusBalance: Number(balancesToUpdate.bonusBalance),
        };

        try {
            await updateUserBalances(userId, numericBalances, reason);
            toast({ title: "Success", description: "User balances have been updated." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update balances.", variant: "destructive" });
        } finally {
            setIsUpdatingBalances(false);
        }
    };

    const onBonusSubmit = async (data: BonusFormData) => {
        setIsGivingBonus(true);
        try {
            await giveBonus(userId, Number(data.amount), data.reason);
            toast({ title: "Bonus Sent", description: `A bonus of $${data.amount} was sent to ${user?.fullName}` });
            resetBonusForm();
        } catch(error) {
            toast({ title: "Error", description: "Failed to send bonus.", variant: "destructive" });
        } finally {
            setIsGivingBonus(false);
        }
    };

    const onNotifSubmit = async (data: { title: string, message: string }) => {
        setIsSendingNotif(true);
        try {
            await sendNotificationToUser(userId, data.title, data.message);
            toast({ title: "Notification Sent", description: `Message sent to ${user?.fullName}` });
            resetNotifForm();
        } catch (error) {
            toast({ title: "Error", description: "Failed to send notification.", variant: "destructive" });
        } finally {
            setIsSendingNotif(false);
        }
    };
    
    const handleProfileUpdate = async (field: keyof UserType, value: string) => {
        if (!user) return;
        const userDocRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userDocRef, { [field]: value });
            toast({ title: 'Success', description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully.` });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: `Failed to update ${field}.`, variant: 'destructive' });
        }
    };

    const handleStatusBadgeClick = () => {
        if (!user) return;
        switch (user.status) {
            case 'active': setBlockModalOpen(true); break;
            case 'blocked': setUnblockModalOpen(true); break;
            case 'suspended': setUnsuspendModalOpen(true); break;
        }
    };

    const processPendingEarnings = async (action: 'approve' | 'decline') => {
        if (!user || !wallet || wallet.pendingBalance <= 0) return;
        setIsProcessingPending(true);
        try {
            await handlePendingEarnings(userId, action, declineReason, wallet.pendingBalance);
            toast({
                title: `Earnings ${action === 'approve' ? 'Approved' : 'Declined'}`,
                description: `The pending balance of $${wallet.pendingBalance.toFixed(2)} has been processed.`
            });
            setDeclineReason('');
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessingPending(false);
        }
    };

    const handleSendReset = async () => {
        if (!user?.email) return;
        try {
            await sendPasswordReset(user.email);
            toast({
                title: 'Password Reset Email Sent',
                description: `A reset link was sent to ${user.email}.`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to send reset link.',
                variant: 'destructive',
            });
        }
    }
    
    const handleImpersonate = async () => {
        if (!user) return;
        setIsImpersonating(true);
        try {
            const admin = auth.currentUser;
            if (!admin) throw new Error("Admin not authenticated");
            
            // Create a plain, serializable object to pass to the server function.
            // This avoids passing complex objects like Firestore Timestamps.
            const plainUserObject = {
                uid: user.uid,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                gender: user.gender,
                customGender: user.customGender,
                country: user.country,
                customCountry: user.customCountry,
                phone: user.phone,
                referralCode: user.referralCode,
                recoveryToken: user.recoveryToken,
                createdAt: user.createdAt,
                photoURL: user.photoURL,
                referrerUid: user.referrerUid,
                grandReferrerUid: user.grandReferrerUid,
                status: user.status,
                role: user.role,
                blockReason: user.blockReason,
                suspensionReason: user.suspensionReason,
                suspensionLiftDate: user.suspensionLiftDate,
            };

            const result = await impersonateUser({ targetUser: plainUserObject, adminUid: admin.uid });
            
            sessionStorage.setItem('impersonating_user', JSON.stringify(result.user));
            
            toast({
                title: `Now Impersonating ${result.user.fullName}`,
                description: 'You are now viewing the app as this user. To exit, use the banner at the top of the screen.'
            });

            // Redirect to the user's dashboard
            router.push('/dashboard');

        } catch (error: any) {
            console.error("Impersonation failed:", error);
            toast({
                title: 'Impersonation Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsImpersonating(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        
        setIsUploading(true);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await axios.post(`https://api.imgbb.com/1/upload?key=7db3a0fdaaa41359aaf55dacfe29aa14`, formData);
            const newPhotoURL = response.data.data.url;

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL: newPhotoURL, updatedAt: serverTimestamp() });

            toast({ title: "Success", description: "Profile picture updated!" });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({ title: "Upload Failed", description: "Could not upload the image. Please try again.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    }

    const handleDeleteProfilePic = async () => {
        if (!user) return;
        setIsUploading(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL: 'https://i.ibb.co/3S1PNY1/Cap-Wallet-Logo.png', updatedAt: serverTimestamp() });
            toast({ title: "Success", description: "Profile picture removed." });
        } catch (error) {
            console.error("Error deleting profile picture:", error);
            toast({ title: "Error", description: "Could not remove profile picture.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    }

    if (loading.user || loading.wallet) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="flex h-full items-center justify-center">
                <p>User not found.</p>
            </div>
        );
    }
    
    const UserStatusBadge = ({ status, onClick }: { status?: 'active' | 'suspended' | 'blocked', onClick?: () => void }) => {
      const isClickable = !!onClick;
      const baseClasses = isClickable ? "cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary" : "";
      switch (status) {
        case 'active':
          return <Badge onClick={onClick} className={cn("bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", baseClasses)}>Active</Badge>;
        case 'suspended':
          return <Badge onClick={onClick} className={cn("bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", baseClasses)}>Suspended</Badge>;
        case 'blocked':
          return <Badge onClick={onClick} variant="destructive" className={cn(baseClasses)}>Blocked</Badge>;
        default:
          return <Badge className={cn(baseClasses)}>Unknown</Badge>;
      }
    };

    return (
    <>
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">User Profile</h1>
            </div>
           
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="relative mx-auto w-fit">
                                <Avatar className="h-24 w-24 border-4 shadow-md">
                                    <AvatarImage src={user.photoURL} />
                                    <AvatarFallback className="text-3xl">{getInitials(user.fullName)}</AvatarFallback>
                                </Avatar>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" className="absolute -bottom-1 -right-1 rounded-full h-8 w-8" disabled={isUploading}>
                                            {isUploading ? <Loader2 className="animate-spin h-4 w-4"/> : <Camera className="h-4 w-4" />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                                            <ImageIcon className="mr-2 h-4 w-4" />
                                            <span>Change Picture</span>
                                        </DropdownMenuItem>
                                        {user?.photoURL && user.photoURL !== 'https://i.ibb.co/3S1PNY1/Cap-Wallet-Logo.png' && (
                                            <DropdownMenuItem onSelect={handleDeleteProfilePic} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                <span>Remove Picture</span>
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            </div>
                        </CardHeader>
                        <CardContent className="text-center">
                            <CardTitle>{user.fullName}</CardTitle>
                            <CardDescription>@{user.username}</CardDescription>
                            <CardDescription>{user.email}</CardDescription>
                            <div className="mt-2 inline-block">
                                <UserStatusBadge status={user.status} onClick={handleStatusBadgeClick} />
                            </div>
                            {wallet?.isFrozen && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Wallet Frozen</Badge>}
                            <p className="text-xs text-muted-foreground mt-2 break-all">UID: {user.uid}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Account Actions</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                             <Button variant="destructive" onClick={() => setBlockModalOpen(true)}>
                                <ShieldOff className="mr-2 h-4 w-4" /> Block
                            </Button>
                            <Button variant="outline" onClick={() => setSuspendModalOpen(true)}>
                                <UserX className="mr-2 h-4 w-4" /> Suspend
                            </Button>
                             <Button variant="outline" className="col-span-2" onClick={() => setFreezeWalletModalOpen(true)}>
                                <Snowflake className="mr-2 h-4 w-4" /> Freeze Wallet
                            </Button>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Send /> Send Notification</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleNotifSubmit(onNotifSubmit)} className="space-y-4">
                                <div>
                                    <Label htmlFor="notif-title">Title</Label>
                                    <Input id="notif-title" placeholder="e.g., Important Update" {...notifRegister("title", { required: true })} />
                                </div>
                                <div>
                                    <Label htmlFor="notif-message">Message</Label>
                                    <Textarea id="notif-message" placeholder="Your message to the user..." {...notifRegister("message", { required: true })}/>
                                </div>
                                <Button type="submit" className="w-full" disabled={isSendingNotif}>
                                    {isSendingNotif ? <Loader2 className="animate-spin" /> : "Send Message"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><AlertTriangle /> Pending Earnings</CardTitle>
                            <CardDescription>Review and process earnings that are awaiting approval.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">Amount Pending</p>
                                    <p className="text-3xl font-bold">${wallet?.pendingBalance.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => processPendingEarnings('approve')} disabled={!wallet?.pendingBalance || isProcessingPending}>
                                        {isProcessingPending ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Approve
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="destructive" disabled={!wallet?.pendingBalance || isProcessingPending}>
                                                <X className="mr-2 h-4 w-4" /> Decline
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Decline Pending Earnings?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will reset the user&apos;s pending balance to $0.00. Please provide a reason for the decline.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <Textarea 
                                                placeholder="e.g., Violation of survey terms..."
                                                value={declineReason}
                                                onChange={(e) => setDeclineReason(e.target.value)}
                                            />
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => processPendingEarnings('decline')} disabled={!declineReason}>
                                                    Confirm Decline
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>User Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-1.5">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input id="fullName" defaultValue={user.fullName} onBlur={(e) => handleProfileUpdate('fullName', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" defaultValue={user.username} onBlur={(e) => handleProfileUpdate('username', e.target.value)} />
                            </div>
                             <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" defaultValue={user.email} onBlur={(e) => handleProfileUpdate('email', e.target.value)} />
                            </div>
                             <div className="space-y-1.5">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" defaultValue={user.phone} onBlur={(e) => handleProfileUpdate('phone', e.target.value)} />
                            </div>
                             <div className="space-y-1.5">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" defaultValue={user.country} onBlur={(e) => handleProfileUpdate('country', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Security Actions</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="flex items-center gap-4 p-4 border rounded-lg">
                                <Mail className="h-8 w-8 text-primary"/>
                                <div>
                                    <p className="font-semibold">Send Password Reset</p>
                                    <p className="text-sm text-muted-foreground">Send a reset link to the user&apos;s email.</p>
                                </div>
                                <Button className="ml-auto" onClick={handleSendReset}>Send</Button>
                            </div>
                            <div className="flex items-center gap-4 p-4 border rounded-lg">
                                <LogIn className="h-8 w-8 text-primary"/>
                                <div>
                                    <p className="font-semibold">Impersonate User</p>
                                    <p className="text-sm text-muted-foreground">Log in as this user to troubleshoot issues.</p>
                                </div>
                                <Button className="ml-auto" onClick={handleImpersonate} disabled={isImpersonating}>
                                    {isImpersonating ? <Loader2 className="animate-spin" /> : "Log In"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet /> Wallet Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {wallet ? (
                                <form onSubmit={handleBalanceSubmit(onBalanceSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Controller name="balance" control={balanceControl} render={({ field }) => (<div className="space-y-1.5"><Label>Main Balance ($)</Label><Input type="number" step="0.01" {...field} /></div>)} />
                                        <Controller name="pendingBalance" control={balanceControl} render={({ field }) => (<div className="space-y-1.5"><Label>Pending ($)</Label><Input type="number" step="0.01" {...field} /></div>)} />
                                        <Controller name="surveyBalance" control={balanceControl} render={({ field }) => (<div className="space-y-1.5"><Label>Survey ($)</Label><Input type="number" step="0.01" {...field} /></div>)} />
                                        <Controller name="referralBalance" control={balanceControl} render={({ field }) => (<div className="space-y-1.5"><Label>Referral ($)</Label><Input type="number" step="0.01" {...field} /></div>)} />
                                    </div>
                                    <div className="space-y-1.5 pt-2">
                                        <Label htmlFor="reason">Reason for Update</Label>
                                        <Textarea id="reason" placeholder="e.g., Manual bonus addition for contest winner." {...balanceRegister("reason", { required: true })} />
                                    </div>
                                    <Button type="submit" disabled={isUpdatingBalances}>
                                        {isUpdatingBalances ? <Loader2 className="animate-spin" /> : "Update Balances"}
                                    </Button>
                                </form>
                            ) : (
                                <p className="text-muted-foreground">No wallet data found.</p>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Gift /> Give Bonus</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <form onSubmit={handleBonusSubmit(onBonusSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="bonus-amount">Bonus Amount ($)</Label>
                                        <Input id="bonus-amount" type="number" step="0.01" placeholder="25.00" {...bonusRegister("amount", { required: true, valueAsNumber: true })} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="bonus-reason">Reason for Bonus</Label>
                                    <Textarea id="bonus-reason" placeholder="e.g., Winner of weekly leaderboard." {...bonusRegister("reason", { required: true })} />
                                </div>
                                <Button type="submit" disabled={isGivingBonus}>
                                    {isGivingBonus ? <Loader2 className="animate-spin" /> : "Send Bonus"}
                                </Button>
                             </form>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Users/>Referral Stats</CardTitle></CardHeader>
                             <CardContent>
                                {loading.stats && !referralStats ? <Loader2 className="animate-spin" /> : referralStats ? (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="font-semibold">Team Size</p><p>{referralStats.teamSize}</p></div>
                                    <div><p className="font-semibold">Direct</p><p>{referralStats.directReferrals}</p></div>
                                    <div><p className="font-semibold">Indirect</p><p>{referralStats.indirectReferrals}</p></div>
                                    <div><p className="font-semibold">Team Earnings</p><p>${referralStats.teamEarnings.toFixed(2)}</p></div>
                                </div>
                                ) : <p className="text-muted-foreground text-sm">No stats.</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2/>Survey History</CardTitle></CardHeader>
                            <CardContent>
                               {loading.history ? <Loader2 className="animate-spin" /> : surveyHistory.length > 0 ? (
                                   <div className="max-h-48 overflow-y-auto">
                                       <Table>
                                           <TableBody>
                                               {surveyHistory.map(s => (
                                                    <TableRow key={s.id}>
                                                        <TableCell>{s.title}</TableCell>
                                                        <TableCell><Badge variant={s.status === 'Success' ? 'default' : s.status === 'Pending' ? 'secondary' : 'destructive'}>{s.status}</Badge></TableCell>
                                                    </TableRow>
                                               ))}
                                           </TableBody>
                                       </Table>
                                   </div>
                               ) : <p className="text-muted-foreground text-sm">No survey history.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
        {/* Modals */}
        <BlockUserModal isOpen={isBlockModalOpen} onClose={() => setBlockModalOpen(false)} user={user} />
        <SuspendAccountModal isOpen={isSuspendModalOpen} onClose={() => setSuspendModalOpen(false)} user={user} />
        <FreezeWalletModal isOpen={isFreezeModalOpen} onClose={() => setFreezeWalletModalOpen(false)} user={user} wallet={wallet} />
        <UnblockUserModal isOpen={isUnblockModalOpen} onClose={() => setUnblockModalOpen(false)} user={user} />
        <UnsuspendUserModal isOpen={isUnsuspendModalOpen} onClose={() => setUnsuspendModalOpen(false)} user={user} />
    </>
    );
}
