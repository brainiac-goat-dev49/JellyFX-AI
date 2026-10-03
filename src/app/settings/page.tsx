
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Palette, Shield, CreditCard, Bell, Trash2, ArrowRight, User as UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDashboardState } from '@/hooks/use-dashboard-state';
import Link from 'next/link';
import { ChangePasswordModal } from '@/components/dashboard/change-password-modal';
import { DeleteAccountModal } from '@/components/dashboard/delete-account-modal';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { logActivity } from '@/services/user';

export default function SettingsPage() {
  const user = useUser();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { notificationSettings, setNotificationSetting } = useDashboardState();
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);

  useEffect(() => {
    if(user) {
        logActivity(user, 'User viewed settings page');
    }
  }, [user]);

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const handleSavePreferences = () => {
      toast({ title: "Preferences Saved", description: "Your appearance settings have been updated." });
  }

  const handleTwoFactorChange = (enabled: boolean) => {
    setIsTwoFactorEnabled(enabled);
    toast({
      title: "Security setting updated",
      description: `Two-Factor Authentication has been ${enabled ? 'enabled' : 'disabled'}.`
    });
  }

  const maskedEmail = user?.email 
    ? `${user.email.substring(0, 3)}****@${user.email.split('@')[1]}` 
    : 'No email found';

  return (
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>

        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                <AvatarImage src={user?.photoURL || ''} alt={user?.fullName || 'User'} />
                <AvatarFallback className="text-3xl">{getInitials(user?.fullName)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold">{user?.fullName}</h2>
              <p className="text-muted-foreground">{user?.username}</p>
              <p className="text-sm text-muted-foreground">{maskedEmail}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="account" className="w-full md:flex md:gap-6">
          <ScrollArea className="w-full md:w-48">
            <TabsList className="flex md:flex-col h-auto md:w-full bg-transparent p-0 items-start w-max">
              <TabsTrigger value="account" className="w-full justify-start gap-2">
                <UserIcon /> Account
              </TabsTrigger>
              <TabsTrigger value="preferences" className="w-full justify-start gap-2">
                <Palette /> Preferences
              </TabsTrigger>
              <TabsTrigger value="security" className="w-full justify-start gap-2">
                <Shield /> Security
              </TabsTrigger>
              <TabsTrigger value="payments" className="w-full justify-start gap-2">
                <CreditCard /> Payment Information
              </TabsTrigger>
              <TabsTrigger value="notifications" className="w-full justify-start gap-2">
                <Bell /> Notifications
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" className="md:hidden"/>
          </ScrollArea>
          <div className="flex-1 mt-6 md:mt-0">
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>View your personal details. For updates, go to Account Management.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={user?.fullName || ""} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ''} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={user?.phone || 'Not provided'} readOnly disabled />
                    </div>
                    <Button asChild>
                      <Link href="/account">Go To Account Management <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                          <p className="text-sm font-medium">Theme</p>
                          <p className="text-sm text-muted-foreground">Switch between light, dark, and system theme.</p>
                      </div>
                      <Select value={theme} onValueChange={setTheme}>
                          <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select theme" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label>Language</Label>
                      <Select>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="fr" disabled>French (soon)</SelectItem>
                              <SelectItem value="es" disabled>Spanish (soon)</SelectItem>
                              <SelectItem value="de" disabled>German (soon)</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <Button onClick={handleSavePreferences}>Save Preferences</Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your account security settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" onClick={() => setChangePasswordModalOpen(true)}>Change Password</Button>
                  <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
                      <div>
                          <p className="text-sm font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                      </div>
                      <Switch 
                        checked={isTwoFactorEnabled}
                        onCheckedChange={handleTwoFactorChange}
                      />
                  </div>
                  <Card className="mt-6 border-destructive">
                      <CardHeader>
                          <CardTitle className="text-destructive flex items-center gap-2"><Trash2/> Danger Zone</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">Deleting your account is a permanent action and cannot be undone.</p>
                          <Button variant="destructive" onClick={() => setDeleteAccountModalOpen(true)}>
                            Delete Account
                          </Button>
                      </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Add payment methods to receive your earnings.</CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                  <p>No payment methods added yet</p>
                  <Button variant="outline" className="mt-4">Add Payment Method</Button>
                </CardContent>
              </Card>
              <Card className="mt-6">
                  <CardHeader>
                      <CardTitle>Tax Information</CardTitle>
                      <CardDescription>Set up your tax information for proper reporting.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button variant="outline">Update Tax Information</Button>
                  </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Manage how you receive notifications from CapWallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <p className="text-sm font-medium">Enable Notifications</p>
                            <p className="text-sm text-muted-foreground">Receive notifications about account activity</p>
                        </div>
                        <Switch
                          checked={notificationSettings.enabled}
                          onCheckedChange={(checked) => setNotificationSetting('enabled', checked)}
                        />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <p className="text-sm font-medium">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          checked={notificationSettings.emailEnabled}
                          onCheckedChange={(checked) => setNotificationSetting('emailEnabled', checked)}
                          disabled={!notificationSettings.enabled}
                        />
                  </div>
                  <Card>
                      <CardHeader><CardTitle>Notification Types</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">New Surveys</p>
                            <Switch
                              checked={notificationSettings.newSurveys}
                              onCheckedChange={(checked) => setNotificationSetting('newSurveys', checked)}
                              disabled={!notificationSettings.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Referral Activity</p>                          <Switch
                              checked={notificationSettings.referralActivity}
                              onCheckedChange={(checked) => setNotificationSetting('referralActivity', checked)}
                              disabled={!notificationSettings.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Payment Updates</p>
                            <Switch
                              checked={notificationSettings.paymentUpdates}
                              onCheckedChange={(checked) => setNotificationSetting('paymentUpdates', checked)}
                              disabled={!notificationSettings.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Trades & Stocks Alert</p>
                            <Switch
                              checked={notificationSettings.tradeAlerts}
                              onCheckedChange={(checked) => setNotificationSetting('tradeAlerts', checked)}
                              disabled={!notificationSettings.enabled}
                            />
                        </div>
                      </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
      />
    </>
  );
}
