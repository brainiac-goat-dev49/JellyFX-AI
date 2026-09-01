"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Loader2, Lock } from 'lucide-react';

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your Email, Username, or Recovery Token."),
  password: z.string().min(1, "Please enter your password."),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setLoading(true);
    const identifier = data.identifier.trim();
    const password = data.password;

    try {
      let targetEmail = identifier;

      if (!identifier.includes('@')) {
        const qUsername = query(collection(db, 'users'), where('username', '==', identifier.toLowerCase()));
        const snapshotUsername = await getDocs(qUsername);

        if (!snapshotUsername.empty) {
          targetEmail = snapshotUsername.docs[0].data().email;
        } else {
          const qToken = query(collection(db, 'users'), where('recoveryToken', '==', identifier));
          const snapshotToken = await getDocs(qToken);

          if (!snapshotToken.empty) {
            targetEmail = snapshotToken.docs[0].data().email;
          } else {
            toast({
              title: "Account Not Found",
              description: "No account found matching that Username or Recovery Token.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      await signInWithEmailAndPassword(auth, targetEmail, password);
      toast({
        title: "Welcome Back!",
        description: "Successfully logged into CapWallet.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid credentials. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      <Card className="max-w-md w-full border-border/60 shadow-xl">
        <CardHeader className="text-center bg-primary text-primary-foreground rounded-t-xl py-6">
          <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2">
            C
          </div>
          <CardTitle className="text-2xl font-bold">Log In to CapWallet</CardTitle>
          <CardDescription className="text-accent-foreground text-xs">
            Enter your Email, Username, or Recovery Token to proceed.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email, Username or Recovery Token</FormLabel>
                    <FormControl>
                      <Input placeholder="email@domain.com or john_doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full mt-2 bg-primary font-semibold" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Login
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Sign Up Now
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
