
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Calendar as CalendarIcon, Loader2, ListFilter, User, Eye, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { rtdb } from '@/lib/firebase';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { User as UserType } from '@/lib/types';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { UserProfileModal } from '@/components/admin/modals/user-profile-modal';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ActivityLog {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhotoURL: string;
  activity: string;
  details?: any;
  timestamp: string;
}

const activityTypes = ['All', 'Auth', 'Survey', 'Trade', 'Referral', 'Support', 'General'];

const getActivityType = (log: ActivityLog): string => {
    const activityText = log.activity.toLowerCase();
    if (activityText.includes('login') || activityText.includes('logout') || activityText.includes('sign up')) return 'Auth';
    if (activityText.includes('survey')) return 'Survey';
    if (activityText.includes('trade')) return 'Trade';
    if (activityText.includes('referral')) return 'Referral';
    if (activityText.includes('message')) return 'Support';
    return 'General';
};

const ActivityTypeBadge = ({ type }: { type: string }) => {
    const colors: { [key: string]: string } = {
        Auth: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        Survey: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Trade: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        Referral: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
        Support: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        General: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <Badge variant="secondary" className={colors[type] || colors['General']}>{type}</Badge>;
};


export default function TrackActivityPage() {
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('All');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 20),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  const LOGS_PER_PAGE = 15;

  useEffect(() => {
    setLoading(true);
    const activityQuery = query(ref(rtdb, 'activityLogs'), orderByChild('timestamp'));
    
    const unsubscribe = onValue(activityQuery, (snapshot) => {
        const logsData = snapshot.val();
        if (logsData) {
            const logs: ActivityLog[] = Object.keys(logsData)
                .map(key => ({ id: key, ...logsData[key] }))
                .reverse();
            setAllLogs(logs);
        } else {
            setAllLogs([]);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      const isDateInRange = dateRange?.from && dateRange?.to ? 
        (logDate >= dateRange.from && logDate <= dateRange.to) : true;
      
      const matchesSearch = searchTerm ?
        (log.userFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
         log.activity.toLowerCase().includes(searchTerm.toLowerCase())) : true;

      const matchesActivityType = activityFilter !== 'All' ?
        getActivityType(log) === activityFilter : true;
      
      return isDateInRange && matchesSearch && matchesActivityType;
    });
  }, [allLogs, dateRange, searchTerm, activityFilter]);

  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
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
  
  const handleViewProfile = (log: ActivityLog) => {
    const user: Partial<UserType> = {
        uid: log.userId,
        fullName: log.userFullName,
        email: log.userEmail,
        photoURL: log.userPhotoURL,
    };
    setSelectedUser(user as UserType);
    setProfileModalOpen(true);
  };

  return (
    <>
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">Track User Activity</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>A comprehensive log of all user actions on the platform.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Search logs..." 
                      className="pl-9 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-[160px]">
                      <ListFilter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                      {activityTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className="w-[240px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
                <TableHead className="hidden md:table-cell">Timestamp</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-48">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length > 0 ? (
                paginatedLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                       <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleViewProfile(log)}>
                          <Avatar>
                              <AvatarImage src={log.userPhotoURL} alt={log.userFullName} />
                              <AvatarFallback>{getInitials(log.userFullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-medium group-hover:underline">{log.userFullName}</p>
                              <p className="text-sm text-muted-foreground">{log.userEmail}</p>
                          </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{log.activity}</span>
                        <ActivityTypeBadge type={getActivityType(log)} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {log.details?.subject && `Subject: ${log.details.subject}`}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin-040806/users/${log.userId}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-48 text-muted-foreground">
                    No activity logs found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-6">
            <ScrollArea className="w-full whitespace-nowrap">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                        </PaginationItem>
                        {[...Array(totalPages)].map((_, i) => (
                          <PaginationItem key={i}>
                            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }} isActive={currentPage === i + 1}>
                                {i + 1}
                            </PaginationLink>
                          </PaginationItem>  
                        ))}
                        <PaginationItem>
                            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}/>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
           </div>
        </CardContent>
      </Card>
    </div>
    <UserProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={selectedUser}
    />
    </>
  );
}
