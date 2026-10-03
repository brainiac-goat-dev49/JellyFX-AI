"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BarChart2, Wallet, Users, User } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Surveys', href: '/surveys', icon: BarChart2 },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    { name: 'Referrals', href: '/referrals', icon: Users },
    { name: 'Account', href: '/account', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around z-40 px-1 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full text-[11px] gap-1 font-medium transition-all relative py-1",
              isActive
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <span className="absolute top-1.5 h-1 w-6 bg-primary rounded-full" />
            )}
            <Icon className={cn("h-5 w-5 transition-transform", isActive ? "text-primary" : "text-muted-foreground")} />
            <span className="tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
