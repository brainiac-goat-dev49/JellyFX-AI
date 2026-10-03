"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Lock } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/40 shadow-lg p-2 backdrop-blur-md">
              <Image 
                src="https://i.ibb.co/3S1PNY1/Cap-Wallet-Logo.png" 
                alt="CapWallet Logo" 
                width={36} 
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">CapWallet</span>
          </Link>
          <p className="text-sm text-slate-300">
            Secure, reliable & high-speed capital wallet management
          </p>
        </div>

        {/* Main Auth Card */}
        <Card className="border border-slate-700/60 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-xl rounded-2xl overflow-hidden">
          {children}
        </Card>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" /> 256-Bit SSL Encrypted
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-teal-400" /> Protected & Verified
          </span>
        </div>
      </div>
    </div>
  );
}
