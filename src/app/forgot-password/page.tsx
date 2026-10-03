
"use client";

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AuthLayout } from '@/components/auth-layout';
import { useToast } from '@/hooks/use-toast';
import { findUserByRecoveryToken, sendPasswordReset } from '@/services/user';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  recoveryToken: z.string().min(1, { message: 'Recovery token is required.' }),
}).refine(data => data.email && data.recoveryToken, {
    message: "Email and recovery token are required",
    path: ["email"],
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      recoveryToken: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        const user = await findUserByRecoveryToken(values.recoveryToken);
        if (!user || user.email.toLowerCase() !== values.email.toLowerCase()) {
            throw new Error("Invalid recovery token or email mismatch.");
        }

        await sendPasswordReset(user.email);
        
        toast({
            title: 'Password Reset Email Sent',
            description: 'Check your Inbox or Spam folder for instructions',
            duration: 8000,
        });

        setTimeout(() => {
            router.push('/login');
        }, 8000);

    } catch (error: any) {
        toast({
            title: 'Error',
            description: error.message || 'Failed to send password reset link.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthLayout>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="p-6 text-center">
                <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
                <CardDescription>
                    Enter your email and recovery token to reset your password.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="recoveryToken"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Recovery Token</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter your token" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </CardContent>
            <CardFooter className="flex flex-col gap-4 p-6 pt-0">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin"/> : 'Send Reset Link' }
                </Button>
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/login">Remembered Password?</Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                Lost your recovery token?{' '}
                <a href="mailto:capwallet.recoveraccount@mbox.re" className="font-semibold text-primary hover:underline">
                    Contact Support
                </a>
                </p>
            </CardFooter>
            </form>
        </Form>
    </AuthLayout>
  );
}
