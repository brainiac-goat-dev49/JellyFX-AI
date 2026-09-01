"use client";

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function ImpersonationBanner() {
  const router = useRouter();

  const handleStopImpersonating = () => {
    sessionStorage.removeItem('impersonating_user');
    router.push('/dashboard');
    window.location.reload();
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>You are currently viewing this account in Admin Impersonation mode.</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStopImpersonating}
        className="h-7 text-xs border-amber-800 text-amber-950 hover:bg-amber-600"
      >
        Exit Impersonation
      </Button>
    </div>
  );
}
