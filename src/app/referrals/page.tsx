

"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { generateAndSaveReferralCode, getUserData } from '@/services/user';
import { Loader2, Copy, Share2, Users, DollarSign, BarChart, Gift, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

export default function ReferralsPage() {
  const user = useUser();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const withdrawalGoal = 100;

  useEffect(() => {
    if (!user) return;

    const walletRef = ref(rtdb, `wallets/${user.uid}/referralBalance`);
    const unsubscribe = onValue(walletRef, (snapshot) => {
      setReferralEarnings(snapshot.val() || 0);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    async function fetchOrCreateReferralCode() {
      if (!user) return;

      try {
        // First check if user object from context has the code
        if (user.referralCode) {
          setReferralCode(user.referralCode);
        } else {
          // If not, fetch latest user data to double check
          const latestUserData = await getUserData(user.uid);
          if (latestUserData?.referralCode) {
             setReferralCode(latestUserData.referralCode);
          } else {
            // If still no code, generate a new one
            const newCode = await generateAndSaveReferralCode(user.uid, user.username);
            setReferralCode(newCode);
          }
        }
      } catch (error) {
        console.error("Failed to fetch or generate referral code:", error);
        toast({
          title: "Error",
          description: "Could not generate your referral code. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchOrCreateReferralCode();
  }, [user, toast]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} Copied!`,
      description: `Your ${type.toLowerCase()} is ready to be shared.`,
    });
  };

  const referralLink = referralCode ? `${window.location.origin}/signup?ref=${referralCode}` : '';
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  const progressValue = (referralEarnings / withdrawalGoal) * 100;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Generating your unique referral code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">Referrals</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Code & Link */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Share & Earn</CardTitle>
            <CardDescription>Share your code with friends and earn $5.00 for each new signup!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <p className="text-sm font-medium">Your Referral Code</p>
                <div className="flex gap-2">
                    <Input readOnly value={referralCode || ''} className="font-mono text-lg h-12"/>
                    <Button size="lg" onClick={() => copyToClipboard(referralCode || '', 'Referral Code')}>
                        <Copy className="h-5 w-5"/>
                    </Button>
                </div>
            </div>
             <div className="space-y-2">
                <p className="text-sm font-medium">Your Referral Link</p>
                <div className="flex gap-2">
                    <Input readOnly value={referralLink} className="h-12"/>
                    <Button size="lg" onClick={() => copyToClipboard(referralLink, 'Referral Link')}>
                         <Share2 className="h-5 w-5"/>
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings & Stats */}
        <Card>
            <CardHeader>
                <CardTitle>Referral Earnings</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-4xl font-bold text-primary">${referralEarnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Earnings</p>
                <Progress value={progressValue} className="mt-4 h-3" />
                <p className="text-xs text-muted-foreground mt-2">Withdrawal unlocked at ${withdrawalGoal.toFixed(2)}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Referral Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">0</p>
                        <p className="text-xs text-muted-foreground">Total Referrals</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold">0</p>
                        <p className="text-xs text-muted-foreground">Active Users</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold">0</p>
                        <p className="text-xs text-muted-foreground">This Month</p>
                    </div>
                 </div>
            </CardContent>
        </Card>
      </div>

      {/* TeamTree Section */}
      <section id="teamtree" className="space-y-6">
        <h2 className="text-xl font-semibold text-center md:text-left">Your TeamTree</h2>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users/> Your Referral Network</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <Avatar className="h-20 w-20 border-4 border-primary shadow-lg">
                             <AvatarImage src={user?.photoURL || ''} alt={user?.fullName || 'User'} />
                             <AvatarFallback className="text-2xl">{getInitials(user?.fullName)}</AvatarFallback>
                        </Avatar>
                    </div>
                    <p className="font-semibold mt-2">{user?.fullName}</p>
                    <p className="text-sm text-muted-foreground">You</p>
                    
                    <div className="mt-8 text-center">
                        <p className="text-muted-foreground">No referrals yet. Share your code to grow your team!</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart/> TeamTree Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Direct Referrals</p>
                            <p className="text-2xl font-bold">0</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Team Size</p>
                            <p className="text-2xl font-bold">0</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Indirect Referrals</p>
                            <p className="text-2xl font-bold">0</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Team Earnings</p>
                            <p className="text-2xl font-bold">$0.00</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift/> TeamTree Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-accent/20 text-accent rounded-full"><Zap className="h-5 w-5"/></div>
                        <div>
                            <p className="font-semibold">Direct Referrals</p>
                            <p className="text-sm text-muted-foreground">Earn $5 for each direct referral who signs up.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="p-2 bg-accent/20 text-accent rounded-full"><Users className="h-5 w-5"/></div>
                        <div>
                            <p className="font-semibold">Multi-Level Earnings</p>
                            <p className="text-sm text-muted-foreground">Earn a percentage from your referrals&apos; earnings.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="p-2 bg-accent/20 text-accent rounded-full"><ShieldCheck className="h-5 w-5"/></div>
                        <div>
                            <p className="font-semibold">Team Bonuses</p>
                            <p className="text-sm text-muted-foreground">Unlock special bonuses as your network grows.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </section>

    </div>
  );
}
