
"use client";

import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Trash2, Camera, User, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useRef } from 'react';
import { DeleteAccountModal } from '@/components/dashboard/delete-account-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import axios from 'axios';


const personalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email(),
  phone: z.string().optional(),
});

const privacySchema = z.object({
    activityTracking: z.boolean(),
    dataCollection: z.boolean(),
});

export default function AccountPage() {
  const user = useUser();
  const { toast } = useToast();
  const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [isDeletePicAlertOpen, setDeletePicAlertOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const maskedEmail = user?.email 
    ? `${user.email.substring(0, 3)}****@${user.email.split('@')[1]}` 
    : 'No email found';

  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const privacyForm = useForm<z.infer<typeof privacySchema>>({
      resolver: zodResolver(privacySchema),
      defaultValues: {
          activityTracking: true,
          dataCollection: true,
      }
  })

  const onPersonalInfoSubmit = async (data: z.infer<typeof personalInfoSchema>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { 
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Success", description: "Personal information updated." });
    } catch (error) {
      console.error("Error updating personal info:", error);
      toast({ title: "Error", description: "Could not update personal information.", variant: "destructive" });
    }
  };
  
  const onPrivacySubmit = (data: z.infer<typeof privacySchema>) => {
    console.log("Privacy settings to be updated:", data);
    toast({ title: "Success", description: "Privacy settings updated." });
  };
  
  const handleDownloadData = () => {
    if (!user) return;
    const userData = {
        uid: user.uid,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        country: user.country,
        gender: user.gender,
        createdAt: user.createdAt,
    };
    const jsonString = JSON.stringify(userData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `capwallet_data_${user.uid}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Data Downloaded", description: "Your personal data has been downloaded." });
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await axios.post(`https://api.imgbb.com/1/upload?key=7db3a0fdaaa41359aaf55dacfe29aa14`, formData);
        const newPhotoURL = response.data.data.url;

        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { photoURL: newPhotoURL, updatedAt: serverTimestamp() });

        toast({ title: "Success", description: "Profile picture updated!" });
    } catch (error) {
        console.error("Error uploading image:", error);
        toast({ title: "Upload Failed", description: "Could not upload the image. Please try again.", variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  }

  const handleDeleteProfilePic = async () => {
    if (!user) return;
    setIsUploading(true);
    try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { photoURL: null, updatedAt: serverTimestamp() });
        toast({ title: "Success", description: "Profile picture removed." });
    } catch (error) {
        console.error("Error deleting profile picture:", error);
        toast({ title: "Error", description: "Could not remove profile picture.", variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  }

  const viewProfilePic = () => {
    if(user?.photoURL) {
      window.open(user.photoURL, '_blank');
    }
  }


  return (
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Account Management</h1>

        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.fullName || 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(user?.fullName)}</AvatarFallback>
                </Avatar>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button size="icon" className="absolute -bottom-1 -right-1 rounded-full h-8 w-8" disabled={isUploading}>
                            {isUploading ? <Loader2 className="animate-spin h-4 w-4"/> : <Camera className="h-4 w-4" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            <span>Change</span>
                         </DropdownMenuItem>
                         {user?.photoURL && (
                            <>
                                <DropdownMenuItem onSelect={viewProfilePic}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>View</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setDeletePicAlertOpen(true)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </>
                         )}
                    </DropdownMenuContent>
                </DropdownMenu>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold">{user?.fullName}</h2>
              <p className="text-muted-foreground">{user?.username}</p>
              <p className="text-sm text-muted-foreground">{maskedEmail}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
              {/* Personal Information */}
              <Card>
              <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details here.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Form {...personalInfoForm}>
                  <form onSubmit={personalInfoForm.handleSubmit(onPersonalInfoSubmit)} className="space-y-6">
                      <FormField
                          control={personalInfoForm.control}
                          name="fullName"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                  <Input placeholder="Your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormItem>
                          <FormLabel>Username</FormLabel>
                          <Input value={user?.username || ''} disabled />
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
                      </FormItem>
                      <FormField
                          control={personalInfoForm.control}
                          name="email"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                  <Input placeholder="Your email address" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={personalInfoForm.control}
                          name="phone"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                  <Input placeholder="Your phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                      <Button type="submit">Update Information</Button>
                  </form>
                  </Form>
              </CardContent>
              </Card>

              {/* Account Actions */}
              <Card>
                  <CardHeader>
                      <CardTitle>Account Actions</CardTitle>
                      <CardDescription>Manage your account and data.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="flex items-start gap-4">
                          <Download className="h-8 w-8 text-primary mt-1"/>
                          <div>
                              <p className="font-semibold">Download My Data</p>
                              <p className="text-sm text-muted-foreground">Get a copy of all your personal data stored in our system.</p>
                              <Button variant="secondary" className="mt-2" onClick={handleDownloadData}>Download Data</Button>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                          <Trash2 className="h-8 w-8 text-destructive mt-1"/>
                          <div>
                              <p className="font-semibold text-destructive">Delete Account</p>
                              <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This cannot be undone.</p>
                              <Button variant="destructive" className="mt-2" onClick={() => setDeleteAccountModalOpen(true)}>Delete Account</Button>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
          
          {/* Privacy Settings */}
          <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control how your information is used.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Form {...privacyForm}>
                      <form onSubmit={privacyForm.handleSubmit(onPrivacySubmit)} className="space-y-8">
                          <FormField
                              control={privacyForm.control}
                              name="activityTracking"
                              render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                      <div className="space-y-0.5">
                                          <FormLabel className="text-base">Activity Tracking</FormLabel>
                                          <p className="text-sm text-muted-foreground">Allow tracking for better recommendations.</p>
                                      </div>
                                      <FormControl>
                                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                                      </FormControl>
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={privacyForm.control}
                              name="dataCollection"
                              render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                      <div className="space-y-0.5">
                                          <FormLabel className="text-base">Data Collection</FormLabel>
                                          <p className="text-sm text-muted-foreground">Allow data collection to improve our services.</p>
                                      </div>
                                      <FormControl>
                                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                                      </FormControl>
                                  </FormItem>
                              )}
                          />
                          <Button type="submit">Save Privacy Settings</Button>
                      </form>
                  </Form>
              </CardContent>
          </Card>
        </div>
      </div>
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
      />
      <AlertDialog open={isDeletePicAlertOpen} onOpenChange={setDeletePicAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove your profile picture.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProfilePic}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
