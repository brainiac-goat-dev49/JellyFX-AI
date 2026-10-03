"use client";

import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Header() {
  const user = useUser();

  const getInitials = (name?: string) => {
    if (!name) return 'CW';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Welcome, {user?.fullName || 'User'}</h2>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/chat">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-1.5 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent font-medium h-9 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Cap AI Assistant</span>
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" />
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.photoURL || ''} alt={user?.fullName || 'User'} />
            <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
