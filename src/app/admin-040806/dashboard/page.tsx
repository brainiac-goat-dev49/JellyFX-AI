
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, BarChart, Activity, MoreHorizontal, ShieldOff, UserX, Snowflake, Loader2, Eye } from 'lucide-react';
import { BlockUserModal } from '@/components/admin/modals/block-user-modal';
import { SuspendAccountModal } from '@/components/admin/modals/suspend-account-modal';
import { FreezeWalletModal } from '@/components/admin/modals/freeze-wallet-modal';
import { UserActivityModal } from '@/components/admin/modals/user-activity-modal';
import { UserProfileModal } from '@/components/admin/modals/user-profile-modal';
import { rtdb, db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


interface ActivityLog {
  id: string; // Document ID from RTDB
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhotoURL: string;
  activity: string;
  details?: any;
  timestamp: string;
}

export default function AdminDashboardPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState({ stats: true, activity: true });
  const [stats, setStats] = useState({ users: 0, surveys: 0, activeToday: 0 });
  const { toast } = useToast();

  const [isBlockModalOpen, setBlockModalOpen] = useState(false);
  const [isSuspendModalOpen, setSuspendModalOpen] = useState(false);
  const [isFreezeWalletOpen, setFreezeWalletOpen] = useState(false);
  const [isActivityModalOpen, setActivityModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedLogUser, setSelectedLogUser] = useState<Partial<UserType> | null>(null);


  useEffect(() => {
    // Fetch stats
    const fetchStats = async () => {
      setLoading(prev => ({...prev, stats: true}));
      try {
        const usersCollectionRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollectionRef);
        const totalUsers = usersSnapshot.size;
        setStats(prev => ({ ...prev, users: totalUsers }));

        const surveysRef = ref(rtdb, 'surveys/available');
        onValue(surveysRef, (snapshot) => {
          const totalSurveys = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
          setStats(prev => ({ ...prev, surveys: totalSurveys }));
        }, { onlyOnce: true });

      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(prev => ({...prev, stats: false}));
      }
    };

    fetchStats();
    
    // Listener for recent activity from all users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activityQuery = query(
        ref(rtdb, "activityLogs"), 
        orderByChild("timestamp"),
        limitToLast(10)
    );

    const unsubscribeActivity = onValue(activityQuery, (snapshot) => {
        setLoading(prev => ({ ...prev, activity: true }));
        const logsData = snapshot.val();
        if (logsData) {
            const logs: ActivityLog[] = Object.keys(logsData).map(key => ({ id: key, ...logsData[key] })).reverse(); // reverse to show newest first
            setActivityLogs(logs);

            // Calculate active today from the fetched logs
            const activeUserIds = new Set(
                Object.values(logsData)
                    .filter((log: any) => new Date(log.timestamp) >= today)
                    .map((log: any) => log.userId)
            );
            setStats(prev => ({...prev, activeToday: activeUserIds.size}))

        } else {
            setActivityLogs([]);
        }
        setLoading(prev => ({ ...prev, activity: false }));
    });

    return () => {
      unsubscribeActivity();
    };
  }, []);

  const openModal = async (modal: 'block' | 'suspend' | 'freeze' | 'activity' | 'profile', logUser: Partial<UserType>) => {
    setSelectedLogUser(logUser);
    try {
      const userDocRef = doc(db, 'users', logUser.uid!);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const user = { uid: userDoc.id, ...userDoc.data() } as UserType;
        setSelectedUser(user);
        if (modal === 'block') setBlockModalOpen(true);
        if (modal === 'suspend') setSuspendModalOpen(true);
        if (modal === 'freeze') setFreezeWalletOpen(true);
        if (modal === 'activity') setActivityModalOpen(true);
        if (modal === 'profile') setProfileModalOpen(true);
      } else {
        toast({ title: "Error", description: "User not found.", variant: "destructive" });
      }
    } catch(e) {
      toast({ title: "Error", description: "Could not fetch user details.", variant: "destructive" });
    }
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const getRelativeTime = (timestamp: string | null) => {
      if (!timestamp) return "N/A";
      try {
        const date = new Date(timestamp);
        return `${formatDistanceToNow(date)} ago`;
      } catch (e) {
        return "Invalid date";
      }
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users /> Site Users</CardTitle>
            </CardHeader>
            <CardContent>
              {loading.stats ? <Skeleton className="h-10 w-20" /> : <p className="text-3xl font-bold">{stats.users}</p>}
              <p className="text-sm text-muted-foreground">Total registered users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart /> Surveys Created</CardTitle>
            </CardHeader>
            <CardContent>
              {loading.stats ? <Skeleton className="h-10 w-16" /> : <p className="text-3xl font-bold">{stats.surveys}</p>}
              <p className="text-sm text-muted-foreground">Total available surveys</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity /> User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading.activity ? <Skeleton className="h-10 w-16" /> : <p className="text-3xl font-bold">{stats.activeToday}</p>}
              <p className="text-sm text-muted-foreground">Users active today</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A log of recent events across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.activity ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : activityLogs.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Activity</TableHead>
                            <TableHead className="hidden md:table-cell">Time</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activityLogs.map(log => {
                            const logUser: Partial<UserType> = {
                                uid: log.userId,
                                fullName: log.userFullName,
                                email: log.userEmail,
                                photoURL: log.userPhotoURL,
                            };
                            return (
                            <TableRow key={log.id}>
                                <TableCell>
                                    <div onClick={() => openModal('profile', logUser)} className="flex items-center gap-3 group cursor-pointer">
                                        <div className="relative">
                                            <Avatar>
                                                <AvatarImage src={log.userPhotoURL} alt={log.userFullName} />
                                                <AvatarFallback>{getInitials(log.userFullName)}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div>
                                            <p className="font-medium group-hover:underline">{log.userFullName}</p>
                                            <p className="text-sm text-muted-foreground">{log.userEmail}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p>{log.activity}</p>
                                    {log.details?.subject && <p className="text-xs text-muted-foreground">Subject: {log.details.subject}</p>}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{getRelativeTime(log.timestamp)}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DropdownMenuItem onSelect={() => openModal('activity', logUser)}>
                                                <Eye className="mr-2 h-4 w-4" /> View All Activity
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => openModal('block', logUser)}>
                                                <ShieldOff className="mr-2 h-4 w-4" /> Block User
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onSelect={() => openModal('suspend', logUser)}>
                                                <UserX className="mr-2 h-4 w-4" /> Suspend Account
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => openModal('freeze', logUser)}>
                                                <Snowflake className="mr-2 h-4 w-4" /> Freeze Wallet
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center text-muted-foreground p-8">
                    <p>No recent activity found.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BlockUserModal 
        isOpen={isBlockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        user={selectedUser}
      />
      <SuspendAccountModal 
        isOpen={isSuspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        user={selectedUser}
      />
      <FreezeWalletModal 
        isOpen={isFreezeWalletOpen}
        onClose={() => setFreezeWalletOpen(false)}
        user={selectedUser}
      />
      <UserActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        user={selectedUser}
      />
       <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={selectedUser}
      />
    </>
  );
}
