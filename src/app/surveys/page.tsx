

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, Cell } from 'recharts';
import { Clock, DollarSign, Lock, PlayCircle, Calendar, FileText, CheckCircle, AlertTriangle, Loader, MoreHorizontal, Info, Trash2, ListX } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import { ResponsiveContainer } from "recharts";
import { useUser } from '@/hooks/use-user';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, runTransaction, remove, push, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { SurveyHistoryItem, Survey } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { logActivity } from '@/services/user';

const chartConfig = {
    value: {
      label: "Count",
    },
    Completed: {
      label: "Completed",
      color: "hsl(var(--chart-2))",
    },
    Pending: {
      label: "Pending",
      color: "hsl(48, 96%, 59%)",
    },
    Rejected: {
      label: "Rejected",
      color: "hsl(var(--destructive))",
    },
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case 'success':
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"><CheckCircle className="mr-1 h-3 w-3" />Success</Badge>;
    case 'ongoing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"><PlayCircle className="mr-1 h-3 w-3" />Ongoing</Badge>;
    case 'failed':
      return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Failed</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"><Loader className="mr-1 h-3 w-3 animate-spin" />Pending</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function SurveysPage() {
  const router = useRouter();
  const user = useUser();
  const { toast } = useToast();
  
  const [availableSurveys, setAvailableSurveys] = useState<Survey[]>([]);
  const [surveyEarnings, setSurveyEarnings] = useState(0);
  const [surveyHistory, setSurveyHistory] = useState<SurveyHistoryItem[]>([]);
  
  const [loading, setLoading] = useState({ surveys: true, history: true, earnings: true });

  const [selectedSurvey, setSelectedSurvey] = useState<SurveyHistoryItem | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const withdrawalGoal = 50;

  useEffect(() => {
    if(user) {
        logActivity(user, 'User viewed surveys page');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch available surveys
    const availableSurveysRef = ref(rtdb, 'surveys/available');
    const unsubscribeSurveys = onValue(availableSurveysRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            const surveyList: Survey[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
            setAvailableSurveys(surveyList);
        } else {
            setAvailableSurveys([]);
        }
        setLoading(prev => ({ ...prev, surveys: false }));
    });

    // Fetch survey history for the user
    const surveyHistoryRef = ref(rtdb, `users/${user.uid}/surveyHistory`);
    const unsubscribeHistory = onValue(surveyHistoryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const historyList = Object.keys(data).map(key => ({
            ...data[key],
            id: key,
          })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setSurveyHistory(historyList);
        } else {
          setSurveyHistory([]);
        }
        setLoading(prev => ({ ...prev, history: false }));
    });
    
    // Fetch survey earnings
    const surveyBalanceRef = ref(rtdb, `wallets/${user.uid}/surveyBalance`);
    const unsubscribeEarnings = onValue(surveyBalanceRef, (snapshot) => {
      setSurveyEarnings(snapshot.val() || 0);
      setLoading(prev => ({ ...prev, earnings: false }));
    });

    return () => {
      unsubscribeSurveys();
      unsubscribeHistory();
      unsubscribeEarnings();
    };
  }, [user]);

  const surveyStatsData = useMemo(() => {
    const stats = { Completed: 0, Pending: 0, Rejected: 0 };
    surveyHistory.forEach(item => {
        if (item.status === 'Success') stats.Completed++;
        else if (item.status === 'Pending') stats.Pending++;
        else if (item.status === 'Failed') stats.Rejected++;
    });
    return [
      { name: 'Completed', value: stats.Completed, fill: "hsl(var(--chart-2))" },
      { name: 'Pending', value: stats.Pending, fill: "hsl(48, 96%, 59%)" },
      { name: 'Rejected', value: stats.Rejected, fill: "hsl(var(--destructive))" },
    ];
  }, [surveyHistory]);

  const handleStartSurvey = (surveyId: string) => {
    sessionStorage.setItem(`capwallet-survey-token-${surveyId}`, 'true');
    router.push(`/surveys/${surveyId}`);
  };

  const handleWithdraw = async () => {
    if (!user || surveyEarnings < withdrawalGoal) return;

    const surveyBalanceRef = ref(rtdb, `wallets/${user.uid}/surveyBalance`);
    const mainBalanceRef = ref(rtdb, `wallets/${user.uid}/balance`);

    try {
        await runTransaction(surveyBalanceRef, (currentBalance) => {
            if (currentBalance === null || currentBalance < surveyEarnings) {
                // Abort transaction if balance is insufficient
                return;
            }
            return currentBalance - surveyEarnings;
        });

        await runTransaction(mainBalanceRef, (currentBalance) => {
            return (currentBalance || 0) + surveyEarnings;
        });
        
        const notifRef = push(ref(rtdb, `notifications/${user.uid}`));
        await set(notifRef, {
            id: notifRef.key,
            type: 'text',
            title: '@transaction.alert: Funds Transferred',
            content: `You have moved $${surveyEarnings.toFixed(2)} from your survey balance to your main wallet.`,
            timestamp: new Date().toISOString(),
            read: false,
        });

        toast({
            title: "Withdrawal Successful",
            description: `You have moved $${surveyEarnings.toFixed(2)} to your main balance.`
        });

    } catch (error) {
        console.error("Withdrawal failed:", error);
        toast({
            title: "Withdrawal Failed",
            description: "Could not complete the withdrawal. Please try again.",
            variant: "destructive"
        });
    }
  }
  
  const handleDeleteSurvey = () => {
    if (!selectedSurvey || !user) return;
    const historyItemRef = ref(rtdb, `users/${user.uid}/surveyHistory/${selectedSurvey.id}`);
    remove(historyItemRef).then(async () => {
        const notifRef = push(ref(rtdb, `notifications/${user.uid}`));
        await set(notifRef, {
            id: notifRef.key,
            type: 'text',
            title: '@survey.alert: History Updated',
            content: `"${selectedSurvey.title}" survey has been removed from your history.`,
            timestamp: new Date().toISOString(),
            read: false,
        });
        toast({
            title: "Survey Deleted",
            description: `"${selectedSurvey.title}" has been removed from your history.`,
        });
        setIsDeleteAlertOpen(false);
        setSelectedSurvey(null);
    }).catch((error) => {
        toast({
            title: "Error",
            description: "Failed to delete survey history.",
            variant: "destructive",
        });
        console.error("Failed to delete survey history", error);
    });
  };

  const openInfoModal = (survey: SurveyHistoryItem) => {
    setSelectedSurvey(survey);
    setIsInfoModalOpen(true);
  }

  const openDeleteAlert = (survey: SurveyHistoryItem) => {
    setSelectedSurvey(survey);
    setIsDeleteAlertOpen(true);
  }

  const progressValue = (surveyEarnings / withdrawalGoal) * 100;

  return (
    <>
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">Surveys</h1>
      
      {/* Available Surveys & Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Available Surveys</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {loading.surveys ? (
                Array.from({ length: 2 }).map((_, index) => (
                    <Card key={index}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                ))
              ) : availableSurveys.length > 0 ? (
                availableSurveys.map(survey => (
                  <Card key={survey.id} className={`flex flex-col ${survey.status === 'soon' ? 'bg-muted/50' : ''}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <FileText/> {survey.title}
                      </CardTitle>
                      <CardDescription>{survey.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4"/> {survey.durationInMinutes} min</span>
                        <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4"/> {survey.reward.toFixed(2)}</span>
                      </div>
                      {survey.status === "ongoing" && survey.progress && (
                          <div className="mt-4">
                              <Progress value={survey.progress} className="h-2" />
                              <p className="text-xs text-right mt-1 text-muted-foreground">{survey.progress}% complete</p>
                          </div>
                      )}
                    </CardContent>
                    <CardContent className="pt-0">
                       {survey.status === 'ready' && <Button className="w-full" onClick={() => handleStartSurvey(survey.id)}><PlayCircle className="mr-2 h-5 w-5"/>Start Survey</Button>}
                       {survey.status === 'ongoing' && <Button className="w-full" onClick={() => handleStartSurvey(survey.id.toString())}>Continue Survey</Button>}
                       {survey.status === 'soon' && <Button className="w-full" disabled><Lock className="mr-2 h-5 w-5"/>Coming Soon</Button>}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="md:col-span-2">
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <ListX className="mx-auto h-12 w-12" />
                        <p className="mt-4">No surveys available at the moment. Please check back later.</p>
                    </CardContent>
                </Card>
              )}
            </div>
        </div>
        
        <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Your Earnings</h2>
             <Card>
                <CardHeader>
                    <CardTitle>Survey Earnings</CardTitle>
                    <CardDescription>Earnings from completed surveys.</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    {loading.earnings ? <Skeleton className="h-10 w-32 mx-auto" /> : <p className="text-4xl font-bold text-primary">${surveyEarnings.toFixed(2)}</p>}
                    <p className="text-sm text-muted-foreground mt-1">Pending Approval</p>
                    <Progress value={progressValue} className="mt-4 h-3" />
                    <p className="text-xs text-muted-foreground mt-2">Withdraw to main balance at ${withdrawalGoal.toFixed(2)}</p>
                     <Button 
                        className="mt-4 w-full" 
                        disabled={surveyEarnings < withdrawalGoal}
                        onClick={handleWithdraw}
                    >
                        Withdraw
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Survey Statistics and History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Survey Statistics</CardTitle>
            <CardDescription>Your survey activity at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
              {loading.history ? <Skeleton className="h-48 w-full" /> : (
                surveyHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                        <p>Complete your first survey to see statistics.</p>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-48 w-full">
                        <ResponsiveContainer>
                            <BarChart data={surveyStatsData} layout="vertical" margin={{ left: 10, right: 30, top:10, bottom:10 }}>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Bar dataKey="value" radius={5}>
                                  {surveyStatsData.map((entry) => (
                                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                  ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                )
              )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Survey History</CardTitle>
            <CardDescription>A log of all your past and ongoing surveys.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Survey</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                          <TableHead><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {loading.history ? (
                          Array.from({length: 3}).map((_, index) => (
                            <TableRow key={index}>
                                <TableCell colSpan={5}><Skeleton className="h-8 w-full"/></TableCell>
                            </TableRow>
                          ))
                      ) : surveyHistory.length > 0 ? (
                          surveyHistory.map(survey => (
                              <TableRow key={survey.id}>
                                  <TableCell className="font-medium">{survey.title}</TableCell>
                                  <TableCell><StatusBadge status={survey.status} /></TableCell>
                                  <TableCell className="hidden md:table-cell">{new Date(survey.date).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-right">${survey.earnings.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">
                                      {survey.status === 'Ongoing' ? (
                                          <Button variant="ghost" size="sm" onClick={() => handleStartSurvey(survey.id.toString())}>Continue</Button>
                                      ) : (
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openInfoModal(survey)}>
                                                        <Info className="mr-2 h-4 w-4"/> Info
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => openDeleteAlert(survey)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                           </DropdownMenu>
                                      )}
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground p-8">
                                You have no survey history yet.
                            </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </div>
    
    {/* Info Modal */}
    <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Survey Details: {selectedSurvey?.title}</DialogTitle>
                <DialogDescription>
                    Information regarding your submitted survey from {selectedSurvey?.date ? new Date(selectedSurvey.date).toLocaleDateString() : ''}.
                </DialogDescription>
            </DialogHeader>
            {selectedSurvey && (
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                        <div><strong>Status:</strong> <StatusBadge status={selectedSurvey.status} /></div>
                        <div><strong>Earnings:</strong> ${selectedSurvey.earnings.toFixed(2)}</div>
                        <div><strong>Completion:</strong> {selectedSurvey.completionPercentage}%</div>
                    </div>
                    <div>
                        <h5 className="font-semibold mb-1">Review Notes:</h5>
                        <p className="text-muted-foreground bg-muted/50 p-3 rounded-md">{selectedSurvey.reviewNotes}</p>
                    </div>
                </div>
            )}
            <Button onClick={() => setIsInfoModalOpen(false)} className="mt-4">Close</Button>
        </DialogContent>
    </Dialog>

    {/* Delete Confirmation */}
    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    <span className="font-semibold"> &quot;{selectedSurvey?.title}&quot; </span> 
                    survey from your history.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSurvey}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
