
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  Home,
  BarChart2,
  Users,
  ShoppingCart,
  User as UserIcon,
  Wallet,
  Info,
  Mail,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useDashboardState } from '@/hooks/use-dashboard-state';
import { NotificationPopover } from './notification-popover';
import { useToast } from '@/hooks/use-toast';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/surveys', label: 'Surveys', icon: BarChart2 },
  { href: '/referrals', label: 'Referrals', icon: Users },
  { href: '/trade', label: 'Trade', icon: ShoppingCart },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
];

const secondaryNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help & Support', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useUser();
  const router = useRouter();
  const { isSidebarOpen, notificationSettings, unreadCount } = useDashboardState();
  const { toast } = useToast();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };
  
  const handleNotificationClick = () => {
    if (!notificationSettings.enabled) {
      toast({
        title: "Notifications Disabled",
        description: "Please enable notifications in the settings page.",
      });
      return false; // Prevent popover from opening
    }
    return true;
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) return email;
    const maskedLocal = localPart.substring(0, 3) + '...';
    return `${maskedLocal}@${domain}`;
  }

  return (
    <aside className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-20"
    )}>
        <div className="flex-grow flex flex-col p-2 space-y-4">
            {/* Profile Card */}
            <div className={cn(
                "rounded-lg p-3 transition-all",
                isSidebarOpen ? "flex items-center gap-3" : "flex flex-col items-center gap-2"
            )}>
                 <Avatar className={cn(isSidebarOpen ? "h-12 w-12" : "h-10 w-10")}>
                    <AvatarImage src={user?.photoURL || ''} alt={user?.fullName || 'User'} />
                    <AvatarFallback>{user?.fullName ? getInitials(user.fullName) : 'CW'}</AvatarFallback>
                </Avatar>
                <div className={cn("overflow-hidden transition-all", isSidebarOpen ? "w-auto" : "w-0 h-0")}>
                   <p className="font-semibold text-sm truncate">{user?.fullName}</p>
                   <p className="text-xs text-muted-foreground truncate">{user?.email ? maskEmail(user.email) : ''}</p>
                </div>
                <NotificationPopover onOpenChange={handleNotificationClick}>
                    <Button variant="ghost" size="icon" className={cn("transition-all relative", isSidebarOpen ? "ml-auto" : "")}>
                        <Bell className="h-5 w-5"/>
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                                {unreadCount}
                            </span>
                        )}
                    </Button>
                </NotificationPopover>
            </div>
            
            {/* Navigation */}
            <nav className="flex-grow px-2">
                <p className={cn("px-2 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2", !isSidebarOpen && "text-center")}>
                   {isSidebarOpen ? "Menu" : "•"}
                </p>
                <ul className="space-y-1">
                  {mainNavItems.map(item => (
                    <li key={item.label}>
                       <Link href={item.href}>
                         <div className={cn(
                             "flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                             (pathname.startsWith(item.href) && item.href !== '/dashboard') || pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                             !isSidebarOpen && "justify-center"
                         )}>
                             <item.icon className="h-5 w-5" />
                             <span className={cn(!isSidebarOpen && "sr-only")}>{item.label}</span>
                         </div>
                       </Link>
                    </li>
                  ))}
                </ul>
                 <p className={cn("px-2 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mt-4 mb-2", !isSidebarOpen && "text-center")}>
                   {isSidebarOpen ? "Help" : "•"}
                </p>
                 <ul className="space-y-1">
                  {secondaryNavItems.map(item => (
                    <li key={item.label}>
                       <Link href={item.href}>
                         <div className={cn(
                             "flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                              pathname.startsWith(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                             !isSidebarOpen && "justify-center"
                         )}>
                             <item.icon className="h-5 w-5" />
                             <span className={cn(!isSidebarOpen && "sr-only")}>{item.label}</span>
                         </div>
                       </Link>
                    </li>
                  ))}
                </ul>
            </nav>
        </div>
        
        {/* Footer */}
        <div className="border-t p-2">
            <button onClick={handleLogout} className={cn(
                 "w-full flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                 !isSidebarOpen && "justify-center"
             )}>
                 <LogOut className="h-5 w-5" />
                 <span className={cn(!isSidebarOpen && "sr-only")}>Logout</span>
            </button>
            <div className={cn(
                 "flex items-center justify-center gap-2 p-2 text-xs text-muted-foreground/60 transition-opacity",
                 !isSidebarOpen && "opacity-0 h-0 overflow-hidden"
             )}>
                <span>Version</span>
                <span className="font-semibold text-primary/80 animate-pulse">1.0¹</span>
            </div>
        </div>
    </aside>
  );
}
