
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, PlusCircle, MoreHorizontal, User, Shield, Edit, UserX, Trash2, Eye, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, rtdb } from '@/lib/firebase';
import { User as UserType } from '@/lib/types';
import { UserProfileModal } from '@/components/admin/modals/user-profile-modal';
import { ref, onValue } from 'firebase/database';
import Link from 'next/link';
import { AddUserModal } from '@/components/admin/modals/add-user-modal';

interface UserWithWallet extends UserType {
    totalEarnings?: number;
    lastSeen?: string;
}

const StatusBadge = ({ status }: { status: UserType['status'] }) => {
  switch (status) {
    case 'active':
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Active</Badge>;
    case 'suspended':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Suspended</Badge>;
    case 'blocked':
      return <Badge variant="destructive">Blocked</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const getInitials = (name: string) => {
    if (!name) return "U";
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
}


export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserWithWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);

    useEffect(() => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersDataPromises = querySnapshot.docs.map(doc => {
                const user = { uid: doc.id, ...doc.data() } as UserType;
                
                return new Promise<UserWithWallet>((resolve) => {
                    const walletRef = ref(rtdb, `wallets/${user.uid}`);
                    onValue(walletRef, (snapshot) => {
                        const walletData = snapshot.val();
                        let totalEarnings = 0;
                        if (walletData) {
                             totalEarnings = (walletData.balance || 0) + 
                                            (walletData.surveyBalance || 0) + 
                                            (walletData.referralBalance || 0) +
                                            (walletData.bonusBalance || 0);
                        }
                        resolve({ ...user, totalEarnings });
                    }, { onlyOnce: true }); // Fetch only once for the list view
                });
            });

            Promise.all(usersDataPromises).then(usersData => {
                setUsers(usersData);
                setLoading(false);
            });

        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleViewProfile = (user: UserType) => {
        setSelectedUser(user);
        setProfileModalOpen(true);
    }

    const filteredUsers = users
        .filter(user => {
            if (activeTab === 'all') return true;
            return user.status === activeTab;
        })
        .filter(user => 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <>
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">User Management</h1>
                
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle>All Users</CardTitle>
                                <CardDescription>Manage, view, and take action on all users.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search by name, email, username..." 
                                        className="pl-9 w-full"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button onClick={() => setAddUserModalOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add User
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="mb-4">
                                <TabsTrigger value="all">All Users</TabsTrigger>
                                <TabsTrigger value="active">Active</TabsTrigger>
                                <TabsTrigger value="suspended">Suspended</TabsTrigger>
                                <TabsTrigger value="blocked">Blocked</TabsTrigger>
                            </TabsList>
                            <TabsContent value={activeTab}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Total Earnings</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="hidden md:table-cell">Role</TableHead>
                                            <TableHead><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24">
                                                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredUsers.length > 0 ? (
                                            filteredUsers.map(user => (
                                            <TableRow key={user.uid}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={user.photoURL || undefined} />
                                                            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{user.fullName}</p>
                                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>${user.totalEarnings?.toFixed(2) || '0.00'}</TableCell>
                                                <TableCell><StatusBadge status={user.status} /></TableCell>
                                                <TableCell className="hidden md:table-cell capitalize">{user.role || 'user'}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                                                                <Eye className="mr-2 h-4 w-4"/> View Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/admin-040806/users/${user.uid}`}>
                                                                    <Edit className="mr-2 h-4 w-4"/> Manage User
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator/>
                                                            <DropdownMenuItem className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Delete User
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">
                                                    No users found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            <UserProfileModal 
                isOpen={isProfileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                user={selectedUser}
            />
            <AddUserModal
                isOpen={isAddUserModalOpen}
                onClose={() => setAddUserModalOpen(false)}
            />
        </>
    );
}
