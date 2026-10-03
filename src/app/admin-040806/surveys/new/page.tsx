
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Check, FileText, ListChecks, Send, Loader2, PlusCircle, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Video, Link as LinkIcon, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { publishSurvey } from '@/services/survey';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Survey, SurveyQuestion } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { SurveyView } from '@/components/dashboard/survey-view';
import Image from 'next/image';
import { fetchLinkMetadata } from '@/services/link-preview';
import axios from 'axios';


interface LinkMetadata {
    title?: string;
    description?: string;
    image?: string | null;
}

const questionSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(1, "Question text is required."),
    type: z.enum(['multiple-choice', 'text', 'button', 'link', 'image', 'video', 'image_grid']),
    isRequired: z.boolean(),
    options: z.array(z.object({
        text: z.string().min(1, "Option cannot be empty."),
        nextQuestionId: z.string().optional(),
    })).optional(),
    url: z.string().optional(),
    label: z.string().optional(),
    images: z.array(z.object({ src: z.string().url(), alt: z.string() })).optional(),
    answerInputs: z.object({
        text: z.boolean().optional(),
        upload: z.boolean().optional(),
        calendar: z.boolean().optional(),
        rating: z.boolean().optional(),
    }).optional(),
}).refine((data) => {
    if (data.type === 'multiple-choice') {
        return data.options && data.options.length >= 2;
    }
    return true;
}, {
    message: "Multiple choice questions must have at least 2 options.",
    path: ["options"], 
}).refine(data => data.type === 'link' ? (data.url && data.url.startsWith('http')) : true, {
    message: "URL is required for link questions.",
    path: ["url"],
}).refine(data => (data.type === 'image' || data.type === 'video') ? !!data.url : true, {
    message: "A valid URL or an uploaded file is required.",
    path: ["url"],
}).refine(data => data.type === 'button' ? !!data.label : true, {
    message: "Button label is required.",
    path: ["label"],
}).refine(data => data.type === 'image_grid' ? data.images && data.images.length > 1 : true, {
    message: "Image grid requires at least 2 images.",
    path: ["images"],
});

const surveyDetailsSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters."),
    description: z.string().min(10, "Description must be at least 10 characters."),
    reward: z.coerce.number().min(0, "Reward cannot be negative."),
    durationInMinutes: z.coerce.number().min(1, "Duration must be at least 1 minute."),
    isPausable: z.boolean().default(false),
    terms: z.string().min(10, "Terms must be at least 10 characters."),
    requirements: z.string().min(10, "Requirements must be at least 10 characters."),
    questions: z.array(questionSchema).min(1, "You must add at least one question."),
});

type SurveyFormData = z.infer<typeof surveyDetailsSchema>;

const steps = [
    { id: 'details', name: 'Survey Details', icon: FileText, fields: ['title', 'description', 'reward', 'durationInMinutes', 'terms', 'requirements'] as const },
    { id: 'questions', name: 'Questions', icon: ListChecks, fields: ['questions'] as const },
    { id: 'publish', name: 'Review & Publish', icon: Send },
];

const LinkPreviewCard = ({ url }: { url: string }) => {
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
                setMetadata(null); 
            } finally {
                setLoading(false);
            }
        };

        const handler = setTimeout(() => fetchMeta(), 500); // Debounce
        return () => clearTimeout(handler);

    }, [url]);

    if (loading) {
        return <div className="flex items-center gap-2 p-2 border rounded-md bg-muted"><Loader2 className="animate-spin h-4 w-4" /><span>Fetching preview...</span></div>
    }

    if (!metadata || (!metadata.title && !metadata.image)) {
        return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{url}</a>
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

export default function NewSurveyPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadContext, setUploadContext] = useState<{ questionIndex: number, imageIndex?: number } | null>(null);
    const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({});
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const form = useForm<SurveyFormData>({
        resolver: zodResolver(surveyDetailsSchema),
        defaultValues: {
            title: '',
            description: '',
            reward: 0,
            durationInMinutes: 5,
            isPausable: false,
            terms: 'By participating, you agree to provide accurate and honest responses. Any attempt to misuse the system will result in disqualification and potential account suspension.',
            requirements: 'A stable internet connection is required. The survey must be completed in a single session unless it is marked as pausable.',
            questions: [],
        },
    });
    
    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: "questions",
    });
    const watchedQuestions = form.watch('questions');

    const addQuestion = (type: SurveyQuestion['type'] = 'multiple-choice') => {
        const nextId = (fields.length + 1).toString();
        let newQuestion: Partial<SurveyQuestion> = {
            id: nextId,
            text: '',
            type: type,
            isRequired: false,
            url: '',
            label: '',
            images: [],
            options: [],
            answerInputs: {
                text: false,
                upload: false,
                calendar: false,
                rating: false,
            }
        };

        switch(type) {
            case 'multiple-choice':
                newQuestion.options = [{text:'', nextQuestionId:''}, {text:'', nextQuestionId:''}];
                break;
            case 'button':
                newQuestion.label = 'Click Me';
                break;
            case 'image_grid':
                newQuestion.images = [{ src: '', alt: '' }, { src: '', alt: '' }];
                break;
        }

        append(newQuestion as SurveyQuestion);
    }

    const addOption = (questionIndex: number) => {
        const path = `questions.${questionIndex}.options` as const;
        const currentOptions = form.getValues(path) || [];
        form.setValue(path, [...currentOptions, { text: '', nextQuestionId: '' }]);
    }

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const path = `questions.${questionIndex}.options` as const;
        const currentOptions = form.getValues(path) || [];
        form.setValue(path, currentOptions.filter((_, i) => i !== optionIndex));
    }

    const addImageToGrid = (questionIndex: number) => {
        const path = `questions.${questionIndex}.images` as const;
        const currentImages = form.getValues(path) || [];
        form.setValue(path, [...currentImages, { src: '', alt: '' }]);
    };

    const removeImageFromGrid = (questionIndex: number, imageIndex: number) => {
        const path = `questions.${questionIndex}.images` as const;
        const currentImages = form.getValues(path) || [];
        form.setValue(path, currentImages.filter((_, i) => i !== imageIndex));
    };

    const handleFileSelect = (context: { questionIndex: number, imageIndex?: number }) => {
        setUploadContext(context);
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!uploadContext) return;
        const file = event.target.files?.[0];
        if (!file) return;

        const uploadId = `${uploadContext.questionIndex}-${uploadContext.imageIndex ?? 'main'}`;
        setUploadingStates(prev => ({ ...prev, [uploadId]: true }));
        
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await axios.post(`https://api.imgbb.com/1/upload?key=7db3a0fdaaa41359aaf55dacfe29aa14`, formData);
            const newPhotoURL = response.data.data.url;

            if (uploadContext.imageIndex !== undefined) {
                form.setValue(`questions.${uploadContext.questionIndex}.images.${uploadContext.imageIndex}.src`, newPhotoURL);
                form.setValue(`questions.${uploadContext.questionIndex}.images.${uploadContext.imageIndex}.alt`, file.name);
            } else {
                form.setValue(`questions.${uploadContext.questionIndex}.url`, newPhotoURL);
            }

            toast({ title: "Success", description: "Image uploaded!" });
        } catch (error) {
            console.error("Error uploading image to imgbb:", error);
            toast({ title: "Upload Failed", description: "Could not upload the image. Please try again.", variant: "destructive" });
        } finally {
            setUploadingStates(prev => ({ ...prev, [uploadId]: false }));
            setUploadContext(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };


    const next = async () => {
        const fieldsToValidate = steps[currentStep].fields;
        if (fieldsToValidate) {
            const output = await form.trigger(fieldsToValidate);
            if (!output) return;
        }

        if (currentStep < steps.length - 1) {
            setCurrentStep(step => step + 1);
        }
    };

    const prev = () => {
        if (currentStep > 0) {
            setCurrentStep(step => step + 1);
        }
    };

    const onSubmit = async (data: SurveyFormData) => {
        setIsSubmitting(true);
        try {
            const surveyData = {
                ...data,
                requirements: data.requirements.split('\n'),
                status: 'ready' as const,
                questions: data.questions.map((q, index) => ({
                    id: String(index + 1),
                    text: q.text,
                    type: q.type,
                    isRequired: q.isRequired,
                    options: q.type === 'multiple-choice' ? q.options : undefined,
                    url: q.type === 'link' || q.type === 'image' || q.type === 'video' ? q.url : undefined,
                    label: q.type === 'button' ? q.label : undefined,
                    images: q.type === 'image_grid' ? q.images : undefined,
                    answerInputs: q.answerInputs,
                })) as SurveyQuestion[]
            };

            await publishSurvey(surveyData);
            toast({
                title: "Survey Published!",
                description: `"${data.title}" is now available to users.`,
            });
            router.push('/admin-040806/surveys');

        } catch (error: any) {
            console.error("Failed to publish survey:", error);
            toast({
                title: "Error",
                description: "Could not publish the survey.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const currentSurveyData = {
        ...form.watch(),
        reward: Number(form.watch('reward')),
        id: 'preview',
        status: 'ready' as const,
        requirements: form.getValues('requirements').split('\n'),
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin-040806/surveys"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">New Survey Creator</h1>
                    <p className="text-muted-foreground">Build and publish a new survey for your users.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <nav aria-label="Progress">
                        <ol role="list" className="flex items-center">
                            {steps.map((step, stepIdx) => (
                                <li key={step.name} className={cn("relative", { 'flex-1': stepIdx !== steps.length - 1 })}>
                                    <div className="flex items-center">
                                        <span className={cn("flex h-9 items-center rounded-full p-2",
                                            currentStep > stepIdx ? 'bg-primary' : currentStep === stepIdx ? 'bg-primary/80 border-2 border-primary' : 'bg-muted'
                                        )}>
                                            <step.icon className={cn("h-5 w-5", currentStep >= stepIdx ? 'text-primary-foreground' : 'text-muted-foreground')} />
                                        </span>
                                        <span className={cn("ml-2 text-sm font-medium", currentStep >= stepIdx ? 'text-primary' : 'text-muted-foreground')}>{step.name}</span>
                                    </div>
                                    {stepIdx !== steps.length - 1 ? (
                                        <div className="absolute left-4 top-1/2 -ml-px mt-0.5 h-0.5 w-full bg-border" aria-hidden="true" />
                                    ) : null}
                                </li>
                            ))}
                        </ol>
                    </nav>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            {currentStep === 0 && (
                                <div className="space-y-6 animate-in fade-in-50">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Consumer Habits Questionnaire" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short description of what this survey is about." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid md:grid-cols-2 gap-6">
                                         <FormField control={form.control} name="reward" render={({ field }) => (
                                            <FormItem><FormLabel>Reward ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                         <FormField control={form.control} name="durationInMinutes" render={({ field }) => (
                                            <FormItem><FormLabel>Duration (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="terms" render={({ field }) => (
                                        <FormItem><FormLabel>Terms</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="requirements" render={({ field }) => (
                                        <FormItem><FormLabel>Requirements (one per line)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="isPausable" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Pausable Survey</FormLabel>
                                                <p className="text-sm text-muted-foreground">Allow users to pause and resume this survey later.</p>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in-50">
                                    <div className="space-y-4">
                                        {fields.map((field, index) => {
                                            const questionType = form.watch(`questions.${index}.type`);
                                            return (
                                                <Card key={field.id} className="p-4 bg-muted/30">
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col gap-1">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => move(index, index - 1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`questions.${index}.text`}
                                                                    render={({ field }) => (
                                                                        <FormItem className="flex-1">
                                                                            <FormLabel>Question {index + 1}</FormLabel>
                                                                            <FormControl><Textarea placeholder="What is your favorite color?" {...field} rows={1} /></FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`questions.${index}.type`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Type</FormLabel>
                                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                                                                <SelectContent>
                                                                                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                                                                    <SelectItem value="text">Text Input</SelectItem>
                                                                                    <SelectItem value="button">Button</SelectItem>
                                                                                    <SelectItem value="link">Link</SelectItem>
                                                                                    <SelectItem value="image">Image</SelectItem>
                                                                                    <SelectItem value="video">Video</SelectItem>
                                                                                    <SelectItem value="image_grid">Image Grid</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mt-8">
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                            
                                                            {questionType === 'multiple-choice' && (
                                                                <div className="space-y-2 pl-4">
                                                                    <Label>Options</Label>
                                                                    {form.getValues(`questions.${index}.options`)?.map((_, optionIndex) => (
                                                                        <div key={`${field.id}-option-${optionIndex}`} className="flex items-center gap-2">
                                                                            <FormField
                                                                                control={form.control}
                                                                                name={`questions.${index}.options.${optionIndex}.text`}
                                                                                render={({ field }) => (
                                                                                    <FormItem className="flex-1">
                                                                                        <FormControl><Input placeholder={`Option ${optionIndex + 1}`} {...field} /></FormControl>
                                                                                        <FormMessage />
                                                                                    </FormItem>
                                                                                )}
                                                                            />
                                                                            <FormField
                                                                                control={form.control}
                                                                                name={`questions.${index}.options.${optionIndex}.nextQuestionId`}
                                                                                render={({ field }) => (
                                                                                    <FormItem>
                                                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                                                            <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Go to next..." /></SelectTrigger></FormControl>
                                                                                            <SelectContent>
                                                                                                <SelectItem value="">Next Question</SelectItem>
                                                                                                <SelectItem value="end">End of Survey</SelectItem>
                                                                                                {watchedQuestions.filter((q, i) => i !== index).map((q, i) => (
                                                                                                    <SelectItem key={q.id || i} value={q.id || `${i+1}`}>
                                                                                                        Question {q.id || i + 1}
                                                                                                    </SelectItem>
                                                                                                ))}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </FormItem>
                                                                                )}
                                                                            />
                                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index, optionIndex)} disabled={(form.getValues(`questions.${index}.options`)?.length ?? 0) <= 2}>
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}>
                                                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {questionType === 'image' && (
                                                                <FormItem><FormLabel>Image</FormLabel>
                                                                    <div className="flex items-center gap-4">
                                                                        <Button type="button" variant="outline" onClick={() => handleFileSelect({ questionIndex: index })} disabled={!!uploadingStates[`${index}-main`]}>
                                                                            {uploadingStates[`${index}-main`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4" />}
                                                                            Upload Image
                                                                        </Button>
                                                                        {form.watch(`questions.${index}.url`) && <img src={form.watch(`questions.${index}.url`)!} alt="preview" width={48} height={48} className="rounded-md" />}
                                                                    </div>
                                                                </FormItem>
                                                            )}
                                                             {questionType === 'video' && (
                                                                <FormItem><FormLabel>Video</FormLabel>
                                                                    <Button type="button" variant="outline" onClick={() => toast({ title: 'Coming Soon', description: 'Video uploads will be available in a future update.' })}>
                                                                        <Video className="mr-2 h-4 w-4" /> Upload Video (Soon)
                                                                    </Button>
                                                                </FormItem>
                                                            )}
                                                            {questionType === 'link' && (
                                                                <FormField control={form.control} name={`questions.${index}.url`} render={({ field }) => (
                                                                    <FormItem><FormLabel>URL</FormLabel>
                                                                    <FormControl><Input placeholder="https://example.com/article" {...field} /></FormControl>
                                                                    <FormMessage />
                                                                    {field.value && <LinkPreviewCard url={field.value}/>}
                                                                    </FormItem>
                                                                )}/>
                                                            )}
                                                            {questionType === 'button' && (
                                                                <FormField control={form.control} name={`questions.${index}.label`} render={({ field }) => (
                                                                    <FormItem><FormLabel>Button Label</FormLabel><FormControl><Input placeholder="e.g., I Acknowledge" {...field} /></FormControl><FormMessage /></FormItem>
                                                                )}/>
                                                            )}
                                                            {questionType === 'image_grid' && (
                                                                <div className="space-y-2 pl-4">
                                                                    <Label>Images</Label>
                                                                    {form.getValues(`questions.${index}.images`)?.map((image, imageIndex) => (
                                                                        <div key={`${field.id}-image-${imageIndex}`} className="flex items-end gap-2">
                                                                            <Button type="button" variant="outline" size="sm" onClick={() => handleFileSelect({ questionIndex: index, imageIndex })} disabled={!!uploadingStates[`${index}-${imageIndex}`]}>
                                                                                {uploadingStates[`${index}-${imageIndex}`] ? <Loader2 className="animate-spin h-4 w-4"/> : <UploadCloud className="h-4 w-4"/>}
                                                                            </Button>
                                                                            {image.src && <img src={image.src} alt={image.alt || `image ${imageIndex}`} width={32} height={32} className="rounded-md"/>}
                                                                            <FormField control={form.control} name={`questions.${index}.images.${imageIndex}.alt`} render={({ field }) => (
                                                                                <FormItem className="flex-1"><FormControl><Input placeholder="Alt text" {...field} /></FormControl><FormMessage /></FormItem>
                                                                            )}/>
                                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeImageFromGrid(index, imageIndex)} disabled={(form.getValues(`questions.${index}.images`)?.length ?? 0) <= 2}>
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => addImageToGrid(index)}>
                                                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Image to Grid
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            <div className="border-t pt-4 mt-4 space-y-4">
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`questions.${index}.isRequired`}
                                                                    render={({ field }) => (
                                                                        <FormItem className="flex flex-row items-center justify-between">
                                                                            <FormLabel>Required Question</FormLabel>
                                                                            <FormControl>
                                                                                <Switch
                                                                                    checked={field.value}
                                                                                    onCheckedChange={field.onChange}
                                                                                />
                                                                            </FormControl>
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <div className="space-y-2">
                                                                    <Label>Answer Inputs</Label>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                                        <FormField control={form.control} name={`questions.${index}.answerInputs.text`} render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Text Area</FormLabel></FormItem>)} />
                                                                        <FormField control={form.control} name={`questions.${index}.answerInputs.upload`} render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">File Upload</FormLabel></FormItem>)} />
                                                                        <FormField control={form.control} name={`questions.${index}.answerInputs.calendar`} render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Date Picker</FormLabel></FormItem>)} />
                                                                        <FormField control={form.control} name={`questions.${index}.answerInputs.rating`} render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Rating (1-5)</FormLabel></FormItem>)} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" onClick={() => addQuestion('multiple-choice')}><PlusCircle className="mr-2 h-4 w-4" /> Add Multiple Choice</Button>
                                        <Button type="button" variant="secondary" onClick={() => addQuestion('text')}><PlusCircle className="mr-2 h-4 w-4" /> Add Text Input</Button>
                                        <Button type="button" variant="secondary" onClick={() => addQuestion('image')}><ImageIcon className="mr-2 h-4 w-4" /> Add Image</Button>
                                    </div>
                                     <FormMessage>{form.formState.errors.questions?.root?.message}</FormMessage>
                                </div>
                            )}

                             {currentStep === 2 && (
                                <div className="space-y-6 animate-in fade-in-50">
                                     <CardTitle>Review Your Survey</CardTitle>
                                     <CardDescription>Review the survey details below. Use the &quot;Live Preview&quot; to test the survey before publishing.</CardDescription>
                                     <Card>
                                        <CardContent className="p-6 space-y-4">
                                            <h3 className="font-bold text-lg">{form.getValues('title')}</h3>
                                            <p className="text-sm">{form.getValues('description')}</p>
                                            <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                                                <span>Reward: ${Number(form.getValues('reward')).toFixed(2)}</span>
                                                <span>Duration: {form.getValues('durationInMinutes')} mins</span>
                                                <span>Pausable: {form.getValues('isPausable') ? 'Yes' : 'No'}</span>
                                                <span>Questions: {form.getValues('questions').length}</span>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                                                <DialogTrigger asChild>
                                                     <Button type="button" variant="outline">Live Preview</Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl max-h-[90vh]">
                                                    <DialogHeader>
                                                        <DialogTitle>Live Survey Preview</DialogTitle>
                                                    </DialogHeader>
                                                    <SurveyView 
                                                        survey={currentSurveyData as Survey} 
                                                        isPreview 
                                                        onClosePreview={() => setIsPreviewOpen(false)}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        </CardFooter>
                                     </Card>
                                </div>
                            )}
                            
                        </form>
                    </Form>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full justify-between">
                        <Button type="button" variant="outline" onClick={prev} disabled={currentStep === 0}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                        
                        {currentStep < steps.length - 1 ? (
                            <Button type="button" onClick={next}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                             <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Publish Survey
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
