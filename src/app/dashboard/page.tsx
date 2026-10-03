
"use client";

import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, BarChart, CheckSquare, Users, ExternalLink, Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { logActivity } from '@/services/user';

interface WalletData {
    balance: number;
    pendingBalance: number;
    surveyBalance: number;
    referralBalance: number;
    completedTasks: number;
}

const initialChartData = (userCreationDate: Date, totalEarnings: number) => {
    const months = [];
    const now = new Date();
    // Ensure the start date is not in the future
    let startDate = userCreationDate > now ? now : userCreationDate;
    
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while(currentMonth <= now) {
        months.push({ month: format(currentMonth, 'MMM'), earnings: 0 });
        currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // If user is new or no months were generated, show at least the current month
    if (months.length === 0) {
       months.push({ month: format(now, 'MMM'), earnings: 0 });
    }

    // Distribute earnings, ensuring the last month has the total earnings
    const distributedData = months.map((data, index) => {
        const proportion = (index + 1) / months.length;
        return {
            ...data,
            earnings: Math.round(totalEarnings * proportion * 0.8), // Simulate growth
        };
    });

    if(distributedData.length > 0) {
        distributedData[distributedData.length - 1].earnings = totalEarnings;
    }
    
    return distributedData;
};


const chartConfig = {
    earnings: {
      label: "Earnings",
      color: "hsl(var(--primary))",
    },
}

export default function DashboardPage() {
  const user = useUser();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [chartData, setChartData] = useState<{ month: string; earnings: number; }[]>([]);
  const [teamTree, setTeamTree] = useState<any[]>([]);

  const totalEarnings = wallet ? wallet.balance + wallet.surveyBalance + wallet.referralBalance : 0;

  useEffect(() => {
      const visited = sessionStorage.getItem('visitedDashboard');
      if (!visited) {
          setIsFirstTimeUser(true);
          sessionStorage.setItem('visitedDashboard', 'true');
      }
  }, []);

    useEffect(() => {
        if(user) {
            logActivity(user, 'User is active on dashboard');
        }
    }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const walletRef = ref(rtdb, `wallets/${user.uid}`);
    const teamTreeRef = ref(rtdb, `teamTrees/${user.uid}`);
    
    const unsubscribeWallet = onValue(walletRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setWallet({
                balance: data.balance ?? 0,
                pendingBalance: data.pendingBalance ?? 0,
                surveyBalance: data.surveyBalance ?? 0,
                referralBalance: data.referralBalance ?? 0,
                completedTasks: data.completedTasks ?? 0,
            });
        } else {
            setWallet({ balance: 0, pendingBalance: 0, surveyBalance: 0, referralBalance: 0, completedTasks: 0 });
        }
    });

    const unsubscribeTeamTree = onValue(teamTreeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setTeamTree(Object.values(data));
        } else {
            setTeamTree([]);
        }
    });

    return () => {
      unsubscribeWallet();
      unsubscribeTeamTree();
    }
  }, [user]);
  
  useEffect(() => {
    if (user && wallet !== null) {
        // Use user's creation date from the auth context
        const creationDate = new Date(user.createdAt);
        const data = initialChartData(creationDate, totalEarnings);
        setChartData(data);
    }
  }, [user, wallet, totalEarnings]);


  const welcomeMessage = isFirstTimeUser 
    ? `Welcome to your dashboard, ${user?.fullName?.split(' ')[0] || 'User'}!` 
    : `Welcome back, ${user?.fullName?.split(' ')[0] || 'User'}!`;

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:p-8 space-y-6 pb-20 md:pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{welcomeMessage}</h1>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {wallet === null ? (
                        <Skeleton className="h-8 w-28" />
                    ) : (
                        <div className="text-2xl font-bold">${totalEarnings?.toFixed(2)}</div>
                    )}
                    <p className="text-xs text-muted-foreground">Welcome bonus included</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {wallet === null ? (
                        <Skeleton className="h-8 w-24" />
                    ) : (
                        <div className="text-2xl font-bold">${wallet.pendingBalance.toFixed(2)}</div>
                    )}
                    <p className="text-xs text-muted-foreground">From pending tasks</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {wallet === null ? (
                        <Skeleton className="h-8 w-12" />
                    ) : (
                        <div className="text-2xl font-bold">{wallet.completedTasks}</div>
                    )}
                     <p className="text-xs text-muted-foreground">No tasks completed yet</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
            {/* Earnings Overview */}
            <Card className="lg:col-span-4">
                <CardHeader>
                    <CardTitle>Earnings Overview</CardTitle>
                    <CardDescription>Track your earnings progress over time.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="w-full overflow-x-auto">
                        <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-[600px]">
                           {chartData.length === 0 ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                           ) : (
                                <ResponsiveContainer>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Line dataKey="earnings" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                           )}
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Team Tree */}
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>TeamTree</CardTitle>
                    <CardDescription>View your referral network.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-center gap-4 p-2 rounded-lg bg-muted/50">
                        <Avatar>
                            <AvatarImage src={user?.photoURL || ''} alt={user?.fullName || 'User'} />
                            <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{user?.fullName}</p>
                            <p className="text-sm text-muted-foreground">You</p>
                        </div>
                     </div>
                     <div className="mt-4 max-h-[150px] overflow-y-auto space-y-2">
                        {teamTree.length > 0 ? (
                            teamTree.map((member: any) => (
                                <div key={member.uid} className="flex items-center gap-4 p-2 rounded-lg border">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.photoURL} />
                                        <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-medium text-sm">{member.fullName}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center p-6 text-sm text-muted-foreground">
                                <p>No referrals yet. Share your code to grow your team!</p>
                            </div>
                        )}
                     </div>
                     <Button variant="link" className="mt-2 w-full" asChild>
                        <Link href="/referrals#teamtree">
                            Go to Referrals <ExternalLink className="ml-2 h-4 w-4"/>
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
