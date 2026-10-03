

"use client";

import { Survey, SurveyQuestion } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Check, Info, Loader2, Star, UploadCloud, Calendar as CalendarIcon } from "lucide-react";
import Image from "next/image";
import { Input } from "../ui/input";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { ref, set, push } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { fetchLinkMetadata } from "@/services/link-preview";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "../ui/calendar";

interface LinkMetadata {
    title?: string;
    description?: string;
    image?: string | null;
}


const LinkPreview = ({ url }: { url: string }) => {
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMeta = async () => {
            if (!url || !url.startsWith('http')) return;
            setLoading(true);
            try {
                const meta = await fetchLinkMetadata(url);
                setMetadata(meta);
            } catch (error) {
                console.error("Failed to fetch link metadata:", error);
                setMetadata({ title: url }); // Fallback to URL
            } finally {
                setLoading(false);
            }
        };

        fetchMeta();
    }, [url]);

    if (loading) {
        return <div className="flex items-center gap-2 p-2 border rounded-md bg-muted"><Loader2 className="animate-spin h-4 w-4" /><span>Fetching preview...</span></div>
    }

    if (!metadata || (!metadata.title && !metadata.image)) {
        return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{url}</a>;
    }

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 group">
            <div className="overflow-hidden rounded-lg border bg-card hover:border-primary transition-colors">
                 {metadata.image && <img src={metadata.image} alt={metadata.title || 'Link preview'} className="w-full h-auto object-cover max-h-48" />}
                <div className="p-4">
                    <p className="text-sm font-semibold truncate group-hover:text-primary">{metadata.title || url}</p>
                    {metadata.description && <p className="text-xs text-muted-foreground truncate">{metadata.description}</p>}
                </div>
            </div>
        </a>
    );
};

const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void; }) => {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={cn("h-8 w-8 cursor-pointer", rating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50")}
                    onClick={() => onRatingChange(star)}
                />
            ))}
        </div>
    )
}


type SurveyStatus = 'pre-start' | 'in-progress' | 'paused' | 'completed' | 'timed-out';

interface SurveyViewProps {
    survey: Survey;
    isPreview?: boolean;
    onClosePreview?: () => void;
}

export function SurveyView({ survey, isPreview = false, onClosePreview }: SurveyViewProps) {
    const router = useRouter();
    const user = useUser();
    const [status, setStatus] = useState<SurveyStatus>('pre-start');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(survey.durationInMinutes * 60);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [progress, setProgress] = useState(0);
    const [timeoutCountdown, setTimeoutCountdown] = useState(4);


    const totalQuestions = survey.questions.length;
    const questionMap = new Map(survey.questions.map((q, i) => [q.id || (i + 1).toString(), i]));


    const handleStart = () => {
        setStatus('in-progress');
    };

    const saveSurveyResult = useCallback(async (resultStatus: 'Pending' | 'Failed', notes: string) => {
        if (!user || isPreview) return; // Don't save in preview mode
    
        const historyRef = push(ref(rtdb, `users/${user.uid}/surveyHistory`));
        const historyItem = {
            id: historyRef.key,
            title: survey.title,
            status: resultStatus,
            date: new Date().toISOString(),
            earnings: resultStatus === 'Pending' ? survey.reward : 0,
            completionPercentage: progress,
            reviewNotes: notes,
        };
        
        await set(historyRef, historyItem);

        const notifRef = push(ref(rtdb, `notifications/${user.uid}`));
        await set(notifRef, {
            id: notifRef.key,
            type: 'text',
            title: `@survey.alert: Survey ${resultStatus}`,
            content: `Your submission for "${survey.title}" is now ${resultStatus.toLowerCase()}. ${notes}`,
            timestamp: new Date().toISOString(),
            read: false,
            data: {
                button: { text: 'View Survey History', link: '/surveys' },
            },
        });

    }, [user, survey.title, survey.reward, progress, isPreview]);

    useEffect(() => {
        if (status !== 'in-progress' || survey.isPausable || isPreview) return;

        if (timeLeft <= 0) {
            setStatus('timed-out');
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [status, timeLeft, survey.isPausable, isPreview]);

    useEffect(() => {
        if (status === 'timed-out') {
            saveSurveyResult('Failed', 'The survey was not completed in time.');
            const countdownTimer = setInterval(() => {
                setTimeoutCountdown(prev => prev - 1);
            }, 1000);

            if (timeoutCountdown <= 0) {
                clearInterval(countdownTimer);
                if (!isPreview) {
                    sessionStorage.removeItem(`capwallet-survey-token-${survey.id}`);
                    router.push('/surveys');
                } else if (onClosePreview) {
                    onClosePreview();
                }
            }
            return () => clearInterval(countdownTimer);
        }
    }, [status, timeoutCountdown, router, survey.id, saveSurveyResult, isPreview, onClosePreview]);
    
    useEffect(() => {
        if (status === 'completed') {
            saveSurveyResult('Pending', 'Your submission is under review and will be processed shortly.');
        }
    }, [status, saveSurveyResult]);

    const handleAnswer = (questionId: string, value: any, inputType?: string) => {
        if (inputType) {
            setAnswers(prev => ({
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    [inputType]: value
                }
            }));
        } else {
             setAnswers(prev => ({...prev, [questionId]: value}));
        }
    }

    const nextQuestion = () => {
        const currentQuestion = survey.questions[currentQuestionIndex];
        const answer = answers[currentQuestion.id];
        let nextQuestionId: string | undefined;

        if (currentQuestion.type === 'multiple-choice' && answer) {
            const selectedOption = currentQuestion.options?.find(opt => opt.text === answer);
            nextQuestionId = selectedOption?.nextQuestionId;
        }

        if (nextQuestionId === 'end') {
            setStatus('completed');
            return;
        }

        if (nextQuestionId && questionMap.has(nextQuestionId)) {
            setCurrentQuestionIndex(questionMap.get(nextQuestionId)!);
        } else {
            if (currentQuestionIndex < totalQuestions - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                setStatus('completed');
            }
        }
    };
    
    useEffect(() => {
       const answeredCount = Object.keys(answers).length;
       const newProgress = Math.round((answeredCount / totalQuestions) * 100);
       setProgress(newProgress);
    }, [answers, totalQuestions]);


    const renderQuestion = (question: SurveyQuestion) => {
        switch (question.type) {
            case 'multiple-choice':
                return (
                    <RadioGroup onValueChange={(val) => handleAnswer(question.id, val)} value={answers[question.id]}>
                        {question.options?.map((opt, i) => (
                            <div key={i} className="flex items-center space-x-2">
                                <RadioGroupItem value={opt.text} id={`${question.id}-${i}`} />
                                <Label htmlFor={`${question.id}-${i}`}>{opt.text}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                );
            case 'text':
                return <Input placeholder="Type your answer here..." onChange={(e) => handleAnswer(question.id, e.target.value)} value={answers[question.id] || ''} />;
            case 'button':
                return <Button onClick={() => handleAnswer(question.id, 'clicked')}>{question.label}</Button>;
            case 'link':
                return <LinkPreview url={question.url!} />;
            case 'image':
                return <Image src={question.url!} alt="Survey Image" width={500} height={300} className="rounded-md" data-ai-hint="survey visual" />;
            case 'video':
                return <video src={question.url!} controls className="w-full rounded-md" />;
            case 'image_grid':
                return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {question.images?.map((img, i) => (
                            <button key={i} className="rounded-md overflow-hidden border-2 border-transparent focus:border-primary focus:outline-none" onClick={() => handleAnswer(question.id, img.src)}>
                                <Image src={img.src} alt={img.alt} width={200} height={200} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )
            default:
                return null;
        }
    }
    
    const renderAnswerInputs = (question: SurveyQuestion) => {
        if (!question.answerInputs) return null;
        return (
            <div className="space-y-4 pt-6 mt-6 border-t">
                <p className="text-sm font-semibold text-muted-foreground">Provide your response:</p>
                {question.answerInputs.text && (
                    <Textarea 
                        placeholder="Type your detailed response here..." 
                        rows={4} 
                        onChange={(e) => handleAnswer(question.id, e.target.value, 'text')}
                        value={answers[question.id]?.text || ''}
                    />
                )}
                {question.answerInputs.upload && (
                    <Button variant="outline"><UploadCloud className="mr-2 h-4 w-4"/> Upload File</Button>
                )}
                {question.answerInputs.calendar && (
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !answers[question.id]?.calendar && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {answers[question.id]?.calendar ? format(answers[question.id].calendar, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={answers[question.id]?.calendar}
                                onSelect={(date) => handleAnswer(question.id, date, 'calendar')}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                )}
                {question.answerInputs.rating && (
                    <StarRating rating={answers[question.id]?.rating || 0} onRatingChange={(rating) => handleAnswer(question.id, rating, 'rating')} />
                )}
            </div>
        )
    }

    if (status === 'pre-start') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="text-2xl">{survey.title}</CardTitle>
                        <CardDescription>{survey.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Terms</h4>
                            <p className="text-sm text-muted-foreground">{survey.terms}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-2">Requirements</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {survey.requirements.map((req, i) => <li key={i}>{req}</li>)}
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleStart} className="w-full">
                            {survey.status === 'ongoing' ? 'Continue Survey' : 'I Understand, Start Survey'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (status === 'in-progress') {
        const currentQuestion = survey.questions[currentQuestionIndex];
        const isAnswered = !!answers[currentQuestion.id];
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center gap-4">
                            <CardTitle>{survey.title}</CardTitle>
                             {!survey.isPausable && !isPreview && (
                                <div className="text-right">
                                    <p className="font-bold text-lg text-primary">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                                    <p className="text-xs text-muted-foreground">Time Left</p>
                                </div>
                             )}
                        </div>
                        <Progress value={progress} className="mt-2" />
                        <p className="text-xs text-muted-foreground text-right mt-1">Question {currentQuestionIndex + 1} of {totalQuestions}</p>
                    </CardHeader>
                    <CardContent className="space-y-6 min-h-[250px]">
                        <p className="font-semibold text-lg">
                            {currentQuestion.text}
                            {currentQuestion.isRequired && <span className="text-destructive ml-1">*</span>}
                        </p>
                        <div>
                            {renderQuestion(currentQuestion)}
                        </div>
                        {renderAnswerInputs(currentQuestion)}
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={nextQuestion} disabled={currentQuestion.isRequired && !isAnswered}>
                            {currentQuestionIndex < totalQuestions - 1 ? 'Next' : 'Finish'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (status === 'completed') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
                <Card className="w-full max-w-xl text-center">
                    <CardHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                             <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="mt-4">Survey Completed!</CardTitle>
                        <CardDescription>
                            {isPreview ? "This is a preview of the completion screen." : "Thank you for your participation. Your response is pending approval."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-left bg-muted/50 p-4 rounded-md">
                           <h4 className="font-semibold mb-2">Your Stats</h4>
                           <ul className="text-sm space-y-1">
                                <li><strong>Completion Percentage:</strong> {progress}%</li>
                                <li><strong>Answers Given:</strong> {Object.keys(answers).length} / {totalQuestions}</li>
                                <li><strong>Est. Earnings:</strong> ${Number(survey.reward).toFixed(2)} (upon approval)</li>
                           </ul>
                        </div>
                         <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>What&apos;s Next?</AlertTitle>
                            <AlertDescription>
                                {isPreview ? "In a real survey, this would be submitted for review." : "Your survey will be reviewed. Once approved, the earnings will be added to your wallet. You can check the status in your survey history."}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter>
                       <Button onClick={() => {
                           if (isPreview && onClosePreview) {
                               onClosePreview();
                           } else {
                               sessionStorage.removeItem(`capwallet-survey-token-${survey.id}`);
                               router.push('/surveys');
                           }
                       }} className="w-full">
                            {isPreview ? 'Close Preview' : 'Back to Surveys'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (status === 'timed-out') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-destructive/10 p-4">
                <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-destructive mb-4" />
                    <h1 className="text-2xl font-bold text-destructive">Time&apos;s Up!</h1>
                    <p className="text-destructive/80 mt-2">
                        {isPreview ? "The timer has run out. This is a preview of the timeout screen." : `This survey has been marked as failed. Redirecting you in ${timeoutCountdown}s...`}
                    </p>
                </div>
            </div>
        )
    }

    return null;
}
