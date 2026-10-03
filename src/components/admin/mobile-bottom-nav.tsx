"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, BarChart3, Mail, Activity } from 'lucide-react';

const navItems = [
  { href: '/admin-040806/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin-040806/users', label: 'Users', icon: Users },
  { href: '/admin-040806/surveys', label: 'Surveys', icon: BarChart3 },
  { href: '/admin-040806/mailbox', label: 'Mailbox', icon: Mail },
  { href: '/admin-040806/track-activity', label: 'Logs', icon: Activity },
];

export function AdminMobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-md md:hidden">
      <nav className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin-040806/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
