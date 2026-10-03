
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Loader2, ListX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import type { Survey } from '@/lib/types';
import { format } from 'date-fns';

export default function AdminSurveysPage() {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const surveysRef = ref(rtdb, 'surveys/available');
        const unsubscribe = onValue(surveysRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const surveyList: Survey[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
                setSurveys(surveyList);
            } else {
                setSurveys([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Survey Management</h1>
                    <p className="text-muted-foreground">Create, view, and manage all user surveys.</p>
                </div>
                <Button asChild>
                    <Link href="/admin-040806/surveys/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Survey
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Available Surveys</CardTitle>
                    <CardDescription>This is a list of all currently available surveys for users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead className="hidden md:table-cell">Status</TableHead>
                                <TableHead className="hidden md:table-cell">Reward</TableHead>
                                <TableHead className="hidden lg:table-cell">Questions</TableHead>
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
                            ) : surveys.length > 0 ? (
                                surveys.map(survey => (
                                    <TableRow key={survey.id}>
                                        <TableCell>
                                            <p className="font-medium">{survey.title}</p>
                                            <p className="text-sm text-muted-foreground hidden md:block">{survey.description}</p>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant={survey.status === 'ready' ? 'default' : 'secondary'}>{survey.status}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">${survey.reward.toFixed(2)}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{survey.questions.length}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-48 text-muted-foreground">
                                        <ListX className="mx-auto h-12 w-12" />
                                        <p className="mt-4">No surveys found.</p>
                                        <p className="text-sm">Click &quot;Create New Survey&quot; to get started.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
