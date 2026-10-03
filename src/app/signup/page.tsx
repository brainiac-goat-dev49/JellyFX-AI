
"use client";

import Link from 'next/link';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AuthLayout } from '@/components/auth-layout';
import { countries } from '@/lib/countries';
import { CheckCircle, Info, Copy, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkUsernameAvailability, signUpWithEmail, findUserByReferralCode } from '@/services/user';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserType } from '@/lib/types';


const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }).refine(val => /^[a-zA-Z0-9]+$/.test(val), {
    message: 'Username can only contain letters and numbers.',
  }),
  gender: z.string().min(1, { message: 'Please select a gender.' }),
  customGender: z.string().optional(),
  country: z.string().min(1, { message: 'Please select a country.' }),
  customCountry: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  referralCode: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.')
    .refine(val => /[A-Z]/.test(val), 'Password must contain an uppercase letter.')
    .refine(val => /[a-z]/.test(val), 'Password must contain a lowercase letter.')
    .refine(val => /[0-9]/.test(val), 'Password must contain a number.')
    .refine(val => /[^a-zA-Z0-9]/.test(val), 'Password must contain a symbol.'),
  confirmPassword: z.string(),
}).refine(data => data.gender !== 'Custom' || (data.gender === 'Custom' && data.customGender && data.customGender.length > 0), {
  message: 'Please specify your gender.',
  path: ['customGender'],
}).refine(data => data.country !== 'Custom' || (data.country === 'Custom' && data.customCountry && data.customCountry.length > 0), {
  message: 'Please specify your country.',
  path: ['customCountry'],
}).refine(data => {
    if (data.country === 'Custom') {
        return !!data.phone && phoneRegex.test(data.phone);
    }
    if (data.phone && data.phone.trim().length > (countries.find(c => c.code === data.country)?.phone.length ?? 0) + 2) {
        return phoneRegex.test(data.phone);
    }
    return true;
}, {
    message: 'A valid phone number is required for custom countries or if provided.',
    path: ['phone'],
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});


function SignUpForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [recoveryToken, setRecoveryToken] = useState('');
    const [tokenCopied, setTokenCopied] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [referrer, setReferrer] = useState<UserType | null>(null);
    const [isCheckingReferral, setIsCheckingReferral] = useState(false);

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

    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: '',
            username: '',
            gender: '',
            customGender: '',
            country: '',
            customCountry: '',
            phone: '',
            email: '',
            referralCode: '',
            password: '',
            confirmPassword: '',
        },
    });

    const watchedCountry = useWatch({ control: form.control, name: 'country' });
    const watchedGender = useWatch({ control: form.control, name: 'gender' });
    const watchedUsername = useWatch({ control: form.control, name: 'username' });
    const watchedPassword = useWatch({ control: form.control, name: 'password' });
    const watchedReferralCode = useWatch({ control: form.control, name: "referralCode" });

    const passwordRequirements = [
        { id: 'uppercase', text: 'An uppercase letter', regex: /[A-Z]/ },
        { id: 'lowercase', text: 'A lowercase letter', regex: /[a-z]/ },
        { id: 'number', text: 'A number', regex: /[0-9]/ },
        { id: 'symbol', text: 'A symbol', regex: /[^a-zA-Z0-9]/ },
        { id: 'minlength', text: 'At least 8 characters', regex: /.{8,}/ },
    ];
    
    const checkReferralCode = useCallback(async (code: string) => {
        if (code && code.length > 5) {
            setIsCheckingReferral(true);
            try {
                const foundReferrer = await findUserByReferralCode(code);
                setReferrer(foundReferrer);
                if (!foundReferrer) {
                    form.setError("referralCode", { type: "manual", message: "Invalid referral code." });
                } else {
                    form.clearErrors("referralCode");
                }
            } catch (error) {
                setReferrer(null);
                form.setError("referralCode", { type: "manual", message: "Error checking code." });
            } finally {
                setIsCheckingReferral(false);
            }
        } else {
            setReferrer(null);
            form.clearErrors("referralCode");
        }
    }, [form]);

    useEffect(() => {
        const refCode = searchParams.get('ref');
        if (refCode) {
            form.setValue('referralCode', refCode);
            checkReferralCode(refCode);
        }
    }, [searchParams, form, checkReferralCode]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (watchedReferralCode) {
                checkReferralCode(watchedReferralCode);
            }
        }, 1000);

        return () => clearTimeout(handler);
    }, [watchedReferralCode, checkReferralCode]);


    useEffect(() => {
        if (watchedCountry) {
            const countryData = countries.find(c => c.code === watchedCountry);
            if (countryData) {
                form.setValue('phone', `+${countryData.phone} `);
            } else {
                form.setValue('phone', '');
            }
        }
    }, [watchedCountry, form]);

    useEffect(() => {
        const username = form.getValues('username');
        if (!username || username.length < 3) {
          setUsernameAvailable(null);
          return;
        }
    
        setIsCheckingUsername(true);
        setUsernameAvailable(null);
        const handler = setTimeout(async () => {
          try {
            const isAvailable = await checkUsernameAvailability(username);
            setUsernameAvailable(isAvailable);
            if (isAvailable) {
              form.clearErrors('username');
            } else {
              form.setError('username', {
                type: 'manual',
                message: 'Username is already taken.',
              });
            }
          } catch(error) {
             console.error("Error checking username", error)
             setUsernameAvailable(null);
          }
          finally {
            setIsCheckingUsername(false);
          }
        }, 1000);
    
        return () => clearTimeout(handler);
      }, [watchedUsername, form]);

    const handleGenerateToken = () => {
        setIsTokenModalOpen(true);
        setIsGeneratingToken(true);
        setTimeout(() => {
            const generatedToken = 'CW-' + [...Array(10)].map(() => Math.random().toString(36)[2]).join('');
            setRecoveryToken(generatedToken);
            setIsGeneratingToken(false);
        }, 1500);
    };
    
    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setTokenCopied(true);
        toast({
            title: 'Copied to clipboard!',
            description: 'Your recovery token has been copied.',
        });
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (usernameAvailable === false) {
          form.setError('username', { type: 'manual', message: 'Username is already taken.' });
          return;
        }
        setIsSubmitting(true);
        try {
          await signUpWithEmail(values, recoveryToken);
    
          toast({
            title: 'Account Created!',
            description: "Please log in to continue.",
          });
          router.push('/login');
        } catch (error: any) {
          toast({
            title: 'Sign-up failed',
            description: error.message || 'An unexpected error occurred.',
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
    
    const getInitials = (name: string | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <AuthLayout>
             {referrer && (
                <div className="flex items-center gap-2 p-3 bg-accent/20 text-accent-foreground rounded-t-lg border-b">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={referrer.photoURL || ''} alt={referrer.fullName} />
                        <AvatarFallback>{getInitials(referrer.fullName)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm">
                        Referred by <span className="font-semibold">{referrer.fullName}</span>
                    </p>
                </div>
            )}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader className="p-6">
                        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
                        <CardDescription>Enter your details below to get started.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Full Name</FormLabel>
                                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="username" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">@</span>
                                        <Input placeholder="johndoe123" {...field} className="pl-7" />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        {isCheckingUsername ? (<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />) : 
                                        usernameAvailable === true && watchedUsername.length >= 3 ? (<CheckCircle className="h-4 w-4 text-green-500" />) :
                                        usernameAvailable === false && watchedUsername.length >= 3 ? (<Info className="h-4 w-4 text-destructive" />) : null
                                        }
                                        </div>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a gender" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        {watchedGender === 'Custom' && (
                            <FormField control={form.control} name="customGender" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Specify Gender</FormLabel>
                                    <FormControl><Input placeholder="Your gender" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}

                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem className={watchedCountry === 'Custom' ? '' : 'md:col-span-2'}>
                                <FormLabel>Country</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                                        <SelectItem value="Custom">Not in list</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {watchedCountry === 'Custom' && (
                            <FormField control={form.control} name="customCountry" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Specify Country</FormLabel>
                                    <FormControl><Input placeholder="Your country" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}

                        <FormField control={form.control} name="phone" render={({ field }) => {
                            const isCustomCountry = watchedCountry === 'Custom';

                            return (
                                <FormItem>
                                    <FormLabel>Phone Number {watchedCountry !== 'Custom' && <span className="text-muted-foreground">(Optional)</span>}</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="+1 123 456 7890" {...field} />
                                    </FormControl>
                                    {isCustomCountry && <FormDescription>Phone number is required for custom countries.</FormDescription>}
                                    <FormMessage />
                                </FormItem>
                            )
                        }}/>

                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                                        <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                    {passwordRequirements.map(req => (
                                        <div key={req.id} className={`flex items-center gap-2 ${watchedPassword && req.regex.test(watchedPassword) ? 'text-green-500' : 'text-muted-foreground'}`}>
                                            {watchedPassword && req.regex.test(watchedPassword) ? <CheckCircle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                                            <span>{req.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                                        <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="md:col-span-2 space-y-2">
                            <FormLabel>Recovery Token</FormLabel>
                            <Button type="button" variant="outline" className="w-full justify-center" onClick={handleGenerateToken} disabled={!!recoveryToken}>
                                {recoveryToken ? 'Token Generated' : 'Generate & Save Your Recovery Token'}
                            </Button>
                            <FormDescription>This token is crucial for account recovery. Store it in a safe place.</FormDescription>
                        </div>

                        <FormField control={form.control} name="referralCode" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Referral Code (Optional)</FormLabel>
                                <FormControl><Input placeholder="Enter referral code" {...field} /></FormControl>
                                {isCheckingReferral && <p className="text-sm text-muted-foreground">Checking code...</p>}
                                <FormMessage />
                            </FormItem>
                        )} />

                         <div className="md:col-span-2 text-center text-sm text-muted-foreground">
                            By creating an account, you agree to our{' '}
                            <Button
                                type="button"
                                variant="link"
                                className="p-0 h-auto align-baseline"
                                onClick={() => setIsTermsModalOpen(true)}
                            >
                                Terms of Service
                            </Button>
                            .
                        </div>

                    </CardContent>
                    <CardFooter className="p-6 pt-0 flex flex-col items-center gap-4">
                        <Button type="submit" className="w-full" disabled={!recoveryToken || isSubmitting || isCheckingUsername || usernameAvailable === false}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Account'}
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/login" className="font-semibold text-primary hover:underline">Login</Link>
                        </p>
                    </CardFooter>
                </form>
            </Form>
            
            <Dialog open={isTokenModalOpen} onOpenChange={isGeneratingToken ? () => {} : setIsTokenModalOpen}>
                <DialogContent showCloseButton={false} onPointerDownOutside={(e) => (isGeneratingToken || !tokenCopied) && e.preventDefault()} onEscapeKeyDown={(e) => (isGeneratingToken || !tokenCopied) && e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Your Recovery Token</DialogTitle>
                        <DialogDescription>
                            Please save this token. You will need it to recover your account if you lose your password.
                        </DialogDescription>
                    </DialogHeader>
                    {isGeneratingToken ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <Alert variant="destructive">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Warning</AlertTitle>
                                <AlertDescription>
                                    Do not share this token with anyone. We will never ask for it. This is the only time you will see it.
                                </AlertDescription>
                            </Alert>
                            <div className="relative rounded-md bg-muted p-4 font-mono text-sm break-all">
                                {recoveryToken}
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => copyToClipboard(recoveryToken)}>
                                    <Copy className="h-4 w-4"/>
                                </Button>
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsTokenModalOpen(false)} disabled={!tokenCopied}>I have copied my token</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isTermsModalOpen} onOpenChange={setIsTermsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Terms of Service</DialogTitle>
                        <p className="text-sm text-muted-foreground pt-1">Last updated: Aug 12, 2025</p>
                    </DialogHeader>
                     <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-4 text-sm text-muted-foreground">
                        <p>Welcome to CapWallet! These terms and conditions outline the rules and regulations for the use of CapWallet&apos;s Website, located at capwallet.web.app.</p>
                        <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use CapWallet if you do not agree to take all of the terms and conditions stated on this page.</p>
                        <h4 className="font-semibold text-card-foreground mt-4 mb-2">License</h4>
                        <p>Unless otherwise stated, CapWallet and/or its licensors own the intellectual property rights for all material on CapWallet. All intellectual property rights are reserved. You may access this from CapWallet for your own personal use subjected to restrictions set in these terms and conditions.</p>
                        <h4 className="font-semibold text-card-foreground mt-4 mb-2">You must not:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Republish material from CapWallet</li>
                            <li>Sell, rent or sub-license material from CapWallet</li>
                            <li>Reproduce, duplicate or copy material from CapWallet</li>
                            <li>Redistribute content from CapWallet</li>
                        </ul>
                        <p>This Agreement shall begin on the date hereof.</p>
                        <p>Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. CapWallet does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of CapWallet,its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions. To the extent permitted by applicable laws, CapWallet shall not be liable for the Comments or for any liability, damages or expenses caused and/or suffered as a result of any use of and/or posting of and/or appearance of the Comments on this website.</p>
                        <p>You can find our full terms at <a href="https://capwallet/terms-of-services.web.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">https://capwallet/terms-of-services.web.app</a>.</p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsTermsModalOpen(false)}>I Understand</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthLayout>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <SignUpForm />
        </Suspense>
    );
}
