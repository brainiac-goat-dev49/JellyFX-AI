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
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Loader2, Mail, KeyRound, HelpCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  recoveryToken: z.string().min(1, "Please enter your recovery token."),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
      recoveryToken: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    setLoading(true);
    const { email, recoveryToken } = data;

    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', email.trim()),
        where('recoveryToken', '==', recoveryToken.trim())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast({
          title: "Verification Failed",
          description: "The provided email and recovery token combination is invalid.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      toast({
        title: "Reset Link Sent!",
        description: "A password reset email has been sent to your address.",
      });
    } catch (error: any) {
      console.error('Reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
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
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-accent-foreground text-xs">
            Verify your email address and recovery token to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
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
                      <Input placeholder="CAP-XXXX-XXXX-XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full mt-2 bg-primary font-semibold" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Reset Link
              </Button>
            </form>
          </Form>

          <div className="space-y-3 pt-4 border-t border-border text-center text-sm">
            <Button
              variant="outline"
              className="w-full font-medium"
              onClick={() => router.push('/login')}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Remembered Password
            </Button>

            <div className="pt-2">
              <a
                href="mailto:capwallet.recoveraccount@instmail.uk"
                className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Lost recovery token?
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
