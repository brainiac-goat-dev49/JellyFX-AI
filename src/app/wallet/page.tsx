

"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, runTransaction, push, set } from 'firebase/database';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Gift, BarChart2, Users, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/services/user';

interface WalletData {
    balance: number;
    pendingBalance: number;
    surveyBalance: number;
    referralBalance: number;
}

const BalanceCard = ({ title, balance, goal, onWithdraw, icon, goalLabel }: { title: string, balance: number, goal: number, onWithdraw: () => void, icon: React.ReactNode, goalLabel: string }) => {
    const progress = Math.min((balance / goal) * 100, 100);
    const canWithdraw = balance >= goal;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon} {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-3xl font-bold">${balance.toFixed(2)}</p>
                <div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">{goalLabel}</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={onWithdraw} disabled={!canWithdraw}>
                    Withdraw to Main Balance <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
};

export default function WalletPage() {
    const user = useUser();
    const { toast } = useToast();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);

    const mainBalanceGoal = 500;
    const surveyBalanceGoal = 50;
    const referralBalanceGoal = 100;
    
    useEffect(() => {
        if(user) {
            logActivity(user, 'User viewed wallet page');
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const walletRef = ref(rtdb, `wallets/${user.uid}`);
        const unsubscribe = onValue(walletRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setWallet(data);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleWithdrawal = async (amount: number, fromBalanceType: 'surveyBalance' | 'referralBalance') => {
        if (!user || !wallet) return;
        
        const fromRef = ref(rtdb, `wallets/${user.uid}/${fromBalanceType}`);
        const toRef = ref(rtdb, `wallets/${user.uid}/balance`);
        
        try {
            // Decrement from the source balance
            await runTransaction(fromRef, (currentBalance) => {
                if (currentBalance === null || currentBalance < amount) {
                    return; // Abort
                }
                return currentBalance - amount;
            });

            // Increment the main balance
            await runTransaction(toRef, (currentBalance) => (currentBalance || 0) + amount);
            
            const fromType = fromBalanceType === 'surveyBalance' ? 'Survey' : 'Referral';

            // Send notification
            const notifRef = push(ref(rtdb, `notifications/${user.uid}`));
            await set(notifRef, {
                id: notifRef.key,
                type: 'text',
                title: `@transaction.alert: Funds Transferred`,
                content: `$${amount.toFixed(2)} from your ${fromType} balance has been successfully moved to your main wallet.`,
                timestamp: new Date().toISOString(),
                read: false
            });

            toast({
                title: "Withdrawal Successful",
                description: `$${amount.toFixed(2)} has been moved to your main wallet.`,
            });
        } catch (error) {
            console.error("Withdrawal transaction failed: ", error);
            toast({
                title: "Withdrawal Failed",
                description: "There was an issue processing your withdrawal. Please try again.",
                variant: "destructive",
            });
        }
    };
    
    const mainBalanceProgress = wallet ? Math.min((wallet.balance / mainBalanceGoal) * 100, 100) : 0;

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Wallet</h1>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 lg:col-span-3" />
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            ) : wallet ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Main Wallet */}
                    <Card className="lg:col-span-3 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet /> Main Wallet</CardTitle>
                            <CardDescription className="text-primary-foreground/80">Your total withdrawable balance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-5xl font-bold">${wallet.balance.toFixed(2)}</p>
                            <div className="mt-4">
                                <Progress value={mainBalanceProgress} className="h-2 bg-primary-foreground/30 [&>div]:bg-primary-foreground" />
                                <p className="text-xs text-primary-foreground/80 mt-2">You&apos;ve reached {mainBalanceProgress.toFixed(0)}% of the ${mainBalanceGoal} minimum withdrawal goal.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                             <Button variant="secondary" disabled={wallet.balance < mainBalanceGoal}>Withdraw Funds</Button>
                             <Button variant="outline">Deposit</Button>
                        </CardFooter>
                    </Card>
                    
                    {/* Survey Earnings */}
                    <BalanceCard
                        title="Survey Earnings"
                        balance={wallet.surveyBalance}
                        goal={surveyBalanceGoal}
                        onWithdraw={() => handleWithdrawal(wallet.surveyBalance, 'surveyBalance')}
                        icon={<BarChart2 />}
                        goalLabel={`Withdrawal unlocked at $${surveyBalanceGoal.toFixed(2)}`}
                    />

                    {/* Referral Earnings */}
                    <BalanceCard
                        title="Referral Earnings"
                        balance={wallet.referralBalance}
                        goal={referralBalanceGoal}
                        onWithdraw={() => handleWithdrawal(wallet.referralBalance, 'referralBalance')}
                        icon={<Users />}
                        goalLabel={`Withdrawal unlocked at $${referralBalanceGoal.toFixed(2)}`}
                    />

                     {/* Bonus Card - Static for now */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gift /> Bonus Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="text-3xl font-bold">$0.00</p>
                             <p className="text-sm text-muted-foreground mt-2">Bonuses from special events will appear here.</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    Could not load wallet data. Please try again later.
                </div>
            )}
        </div>
    );
}
