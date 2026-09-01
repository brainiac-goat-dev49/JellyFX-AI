"use client";

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Loader2, CheckCircle2, XCircle, Copy, Shield, FileText } from 'lucide-react';

const COUNTRIES = [
  { name: "United States", code: "+1" },
  { name: "United Kingdom", code: "+44" },
  { name: "Canada", code: "+1" },
  { name: "Australia", code: "+61" },
  { name: "Germany", code: "+49" },
  { name: "France", code: "+33" },
  { name: "Japan", code: "+81" },
  { name: "Custom / Other", code: "" },
];

const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  username: z.string().min(3, "Username must be at least 3 characters.").regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores allowed."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  gender: z.string().min(1, "Please select gender."),
  customGender: z.string().optional(),
  country: z.string().min(1, "Please select country."),
  customCountry: z.string().optional(),
  phoneCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  referralCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.gender === "custom" && (!data.customGender || data.customGender.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify your gender.",
      path: ["customGender"],
    });
  }
  if (data.country === "Custom / Other") {
    if (!data.customCountry || data.customCountry.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter your country name.",
        path: ["customCountry"],
      });
    }
    if (!data.phoneNumber || data.phoneNumber.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is required for custom country.",
        path: ["phoneNumber"],
      });
    }
  }
});

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [isRecoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [isTosModalOpen, setTosModalOpen] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      username: '',
      password: '',
      gender: '',
      customGender: '',
      country: '',
      customCountry: '',
      phoneCode: '',
      phoneNumber: '',
      referralCode: '',
    },
  });

  const selectedCountry = form.watch('country');
  const watchedUsername = form.watch('username');
  const watchedGender = form.watch('gender');

  useEffect(() => {
    if (selectedCountry && selectedCountry !== "Custom / Other") {
      const match = COUNTRIES.find((c) => c.name === selectedCountry);
      if (match) {
        form.setValue('phoneCode', match.code);
      }
    } else if (selectedCountry === "Custom / Other") {
      form.setValue('phoneCode', '');
    }
  }, [selectedCountry, form]);

  useEffect(() => {
    if (!watchedUsername || watchedUsername.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '==', watchedUsername.trim().toLowerCase())
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedUsername]);

  const generateRecoveryToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = 'CAP-';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) token += '-';
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const onPreSubmit = (data: z.infer<typeof signUpSchema>) => {
    if (usernameStatus === 'taken') {
      toast({
        title: "Username taken",
        description: "Please choose a different username.",
        variant: "destructive",
      });
      return;
    }

    const token = generateRecoveryToken();
    setGeneratedToken(token);
    setRecoveryModalOpen(true);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(generatedToken);
    toast({
      title: "Copied!",
      description: "Recovery token copied to clipboard.",
    });
  };

  const handleProceedToTos = () => {
    setRecoveryModalOpen(false);
    setTosModalOpen(true);
  };

  const handleFinalSignUp = async () => {
    if (!tosAgreed) {
      toast({
        title: "Terms of Service Required",
        description: "Please accept the Terms of Service to create an account.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const formData = form.getValues();

    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;

      const finalGender = formData.gender === 'custom' ? formData.customGender : formData.gender;
      const finalCountry = formData.country === 'Custom / Other' ? formData.customCountry : formData.country;
      const finalPhone = formData.phoneCode
        ? `${formData.phoneCode} ${formData.phoneNumber || ''}`.trim()
        : formData.phoneNumber || '';

      await setDoc(doc(db, 'users', uid), {
        fullName: formData.fullName,
        username: formData.username.toLowerCase(),
        email: formData.email,
        gender: finalGender,
        country: finalCountry,
        phone: finalPhone,
        referralCode: formData.referralCode || null,
        recoveryToken: generatedToken,
        photoURL: null,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Account Created!",
        description: "Welcome to CapWallet.",
      });

      setTosModalOpen(false);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      <Card className="max-w-xl w-full border-border/60 shadow-xl my-8">
        <CardHeader className="text-center bg-primary text-primary-foreground rounded-t-xl py-6">
          <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2">
            C
          </div>
          <CardTitle className="text-2xl font-bold">Create CapWallet Account</CardTitle>
          <CardDescription className="text-accent-foreground text-xs">
            Join thousands managing capital with security and clarity.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onPreSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="johndoe123" {...field} />
                        <div className="absolute right-3 top-2.5 flex items-center">
                          {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          {usernameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {usernameStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      </div>
                    </FormControl>
                    {usernameStatus === 'available' && (
                      <p className="text-xs text-emerald-600 font-medium">Username is available!</p>
                    )}
                    {usernameStatus === 'taken' && (
                      <p className="text-xs text-destructive font-medium">Username is already taken.</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender selection */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        <SelectItem value="custom">Custom / Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedGender === 'custom' && (
                <FormField
                  control={form.control}
                  name="customGender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify Gender</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter gender" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Country dropdown */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name} {c.code ? `(${c.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCountry === 'Custom / Other' && (
                <FormField
                  control={form.control}
                  name="customCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Country Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter country name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Phone number */}
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="phoneCode"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="+1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="555-0199" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Referral Code */}
              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="REF-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full mt-6 bg-primary font-semibold" size="lg">
                Continue Account Setup
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Token Modal */}
      <Dialog open={isRecoveryModalOpen} onOpenChange={setRecoveryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-6 w-6" />
              <DialogTitle>Your Secret Recovery Token</DialogTitle>
            </div>
            <DialogDescription>
              Please save this token in a safe place. You will need it if you forget your password or lose access to your account.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-secondary/80 border border-border flex items-center justify-between">
            <span className="font-mono text-lg font-bold tracking-wider text-primary">{generatedToken}</span>
            <Button size="icon" variant="ghost" onClick={handleCopyToken}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={handleProceedToTos} className="w-full bg-primary font-semibold">
              I Have Saved My Recovery Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={isTosModalOpen} onOpenChange={setTosModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-6 w-6" />
              <DialogTitle>Terms of Service & Rules</DialogTitle>
            </div>
            <DialogDescription>
              Review and agree to CapWallet terms before completing registration.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 max-h-60 overflow-y-auto text-sm text-muted-foreground space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
            <p><strong>1. Account Security:</strong> You are responsible for maintaining confidentiality over your password and recovery token.</p>
            <p><strong>2. Authorized Transactions:</strong> All capital transfers executed through your account are binding.</p>
            <p><strong>3. Privacy:</strong> We collect essential data to verify user identities and maintain platform security.</p>
            <p>
              Full document available at:{' '}
              <a
                href="https://capwallet/terms-of-services.web.app"
                target="_blank"
                rel="noreferrer"
                className="text-accent font-semibold underline"
              >
                https://capwallet/terms-of-services.web.app
              </a>
            </p>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="tos"
              checked={tosAgreed}
              onCheckedChange={(checked) => setTosAgreed(!!checked)}
            />
            <label htmlFor="tos" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I agree to the CapWallet Terms of Service
            </label>
          </div>

          <DialogFooter>
            <Button
              onClick={handleFinalSignUp}
              disabled={!tosAgreed || submitting}
              className="w-full bg-primary font-semibold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
