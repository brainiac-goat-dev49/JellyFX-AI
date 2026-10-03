
"use client";

import { Menu, Sun, Moon, Bell, Bot, LogOut, Settings, HelpCircle, Info, User as UserIcon, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser } from '@/hooks/use-user';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useTheme } from 'next-themes';
import { useDashboardState } from '@/hooks/use-dashboard-state';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export function Header() {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { onSidebarToggle, setSheetOpen, notificationSettings, unreadCount } = useDashboardState();
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
    } else {
      setSheetOpen('notifications', true);
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
  const showAiButton = !pathname.startsWith('/surveys');

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="hidden md:flex" onClick={onSidebarToggle}>
          <Menu />
        </Button>
        <div className="flex items-center gap-2">
            <Image src="https://i.ibb.co/3S1PNY1/Cap-Wallet-Logo.png" alt="CapWallet Logo" width={28} height={28} />
            <span className="text-xl font-bold text-primary">CapWallet</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                    {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                    {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                     {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" size="icon" className="md:hidden relative" onClick={handleNotificationClick}>
            <Bell className="h-5 w-5"/>
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                </span>
            )}
        </Button>
        
        {/* AI Chat Trigger for Mobile */}
        {showAiButton && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSheetOpen('ai', true)}>
                <Bot className="h-5 w-5"/>
            </Button>
        )}

        {/* Profile Icon Dropdown */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.fullName || 'User'} />
                        <AvatarFallback>{user?.fullName ? getInitials(user.fullName) : 'CW'}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                 {/* Desktop Dropdown */}
                <div className="hidden md:block">
                     <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                </div>
                {/* Mobile Dropdown */}
                <div className="md:hidden">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/account')}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => router.push('/dashboard/about')}>
                        <Info className="mr-2 h-4 w-4" />
                        <span>About CapWallet</span>
                         <span className="ml-auto text-xs text-muted-foreground">v1.0¹</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push('/help#contact')}>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>Contact Us</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
