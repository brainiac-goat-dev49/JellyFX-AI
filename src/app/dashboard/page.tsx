"use client";

import { useUser } from '@/hooks/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Send, ShieldCheck, RefreshCw, Bot, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const user = useUser();

  const mockTransactions = [
    { id: '1', type: 'deposit', amount: 2500.00, currency: 'USD', status: 'completed', date: '2025-02-28', description: 'Bank Wire Transfer' },
    { id: '2', type: 'transfer', amount: 150.00, currency: 'USD', status: 'completed', date: '2025-02-27', description: 'Sent to @alex99' },
    { id: '3', type: 'withdrawal', amount: 500.00, currency: 'USD', status: 'completed', date: '2025-02-25', description: 'ATM Cash Withdrawal' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Capital Portfolio</h1>
        <p className="text-sm text-muted-foreground">Overview of your CapWallet balances and real-time operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground md:col-span-2 shadow-lg relative overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Total Wallet Balance</span>
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center font-bold text-white">
                C
              </div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight">$12,450.80</div>
              <p className="text-xs text-accent-foreground mt-2 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> Account Verified & Encrypted
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="sm" className="bg-accent text-white hover:bg-accent/90 gap-1.5 font-medium">
                <ArrowDownLeft className="h-4 w-4" /> Deposit
              </Button>
              <Button size="sm" variant="secondary" className="gap-1.5 font-medium">
                <ArrowUpRight className="h-4 w-4" /> Withdraw
              </Button>
              <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10 gap-1.5 font-medium">
                <Send className="h-4 w-4" /> Transfer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg">Account Summary</CardTitle>
            <CardDescription>Key info for {user?.username || 'user'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground">Account Holder</span>
              <span className="font-semibold">{user?.fullName || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground">Country</span>
              <span className="font-semibold">{user?.country || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Banner */}
      <Card className="border-accent/30 bg-gradient-to-r from-accent/10 via-secondary/40 to-background shadow-sm overflow-hidden">
        <CardContent className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-accent text-white flex items-center justify-center font-bold shrink-0 shadow">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">Cap AI Financial Assistant</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent text-white">
                  Multi-Turn
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                Get real-time answers about your wallet, analyze capital allocations, or explore recovery security with Gemini.
              </p>
            </div>
          </div>
          <Link href="/dashboard/chat">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0 font-medium text-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Open AI Chat
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Your latest financial operations.</CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                    tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600' :
                    tx.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-600' :
                    'bg-sky-500/10 text-sky-600'
                  }`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft className="h-5 w-5" /> :
                     tx.type === 'withdrawal' ? <ArrowUpRight className="h-5 w-5" /> :
                     <Send className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${
                    tx.type === 'deposit' ? 'text-emerald-600' : 'text-foreground'
                  }`}>
                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </p>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
