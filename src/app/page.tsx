"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Wallet, ArrowRight, Lock, Zap } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasVisited = localStorage.getItem('capwallet_welcome_seen');
    if (hasVisited) {
      router.replace('/login');
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleGetStarted = () => {
    localStorage.setItem('capwallet_welcome_seen', 'true');
    router.push('/signup');
  };

  if (loading) {
    return null;
  }

  const features = [
    {
      step: "01",
      title: "Bank-Grade Security",
      description: "Advanced recovery tokens and encrypted user authentication.",
      icon: ShieldCheck,
    },
    {
      step: "02",
      title: "Instant Capital Management",
      description: "Track, transfer, and manage your financial assets effortlessly.",
      icon: Wallet,
    },
    {
      step: "03",
      title: "Lightning Fast Operations",
      description: "Real-time updates and seamless modern digital wallet interface.",
      icon: Zap,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      <Card className="max-w-2xl w-full border-border/60 shadow-xl overflow-hidden">
        <div className="bg-primary p-8 text-primary-foreground text-center flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center text-white font-black text-3xl shadow-lg mb-4">
            C
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">CapWallet</h1>
          <p className="text-accent-foreground text-sm font-medium mt-1">Next-Generation Capital Asset Management</p>
        </div>

        <CardContent className="p-6 md:p-8 space-y-8">
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-foreground">
              Your Gateway to Secure & Seamless Wealth Control
            </h3>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              CapWallet empowers you with complete oversight over your funds, secured by robust recovery token protocols and intuitive real-time tools.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent-foreground">
                        Step {item.step}
                      </span>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 gap-2 group"
            >
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" /> Encrypted & Secure Portal
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
