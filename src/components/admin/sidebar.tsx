"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Mail,
  Activity,
  LogOut,
  ChevronRight,
  Shield,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin-040806/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin-040806/users', label: 'Users Management', icon: Users },
  { href: '/admin-040806/surveys', label: 'Surveys', icon: BarChart3 },
  { href: '/admin-040806/mailbox', label: 'Mailbox & Alerts', icon: Mail },
  { href: '/admin-040806/track-activity', label: 'Activity Logs', icon: Activity },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card text-card-foreground">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
          <Image
            src="https://i.ibb.co/3S1PNY1/Cap-Wallet-Logo.png"
            alt="CapWallet Logo"
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-primary flex items-center gap-1.5">
            CapWallet <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Admin</span>
          </span>
          <span className="text-[10px] text-muted-foreground">Control Console</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Management
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin-040806/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
              </div>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Quick Links
          </p>
          <Link href="/dashboard">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Home className="h-4 w-4" />
              <span>User Dashboard</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Exit Admin</span>
        </Button>
      </div>
    </aside>
  );
}
