import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@components/card';
import { Button } from '@components/button';
import { Select } from '@components/select';
import { DatabaseSelector } from './components/database-selector';
import { QueryEditor } from './components/query-form';
import { ScriptForm } from './components/script-form';
import { useSubmitRequest } from './queries/use-submit-request';
import { usePods } from './queries/use-databases';
import { DatabaseType, SubmissionType } from '@/types';
import { ROUTES } from '@constants/routes';
import toast from 'react-hot-toast';

// Form schema with conditional validation
const formSchema = z.object({
    databaseType: z.enum(['postgresql', 'mongodb'], {
        message: 'Database type is required',
    }),
    instanceId: z.string().min(1, 'Instance is required'),
    databaseName: z.string().min(1, 'Database is required'),
    submissionType: z.enum(['query', 'script']),
    comments: z.string().min(1, 'Comments are required'),
    podId: z.string().min(1, 'POD is required'),
    query: z.string().optional(),
    script: z.instanceof(File).nullable().optional(),
}).superRefine((data, ctx) => {
    if (data.submissionType === 'query' && (!data.query || !data.query.trim())) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Query is required',
            path: ['query'],
        });
    }
    if (data.submissionType === 'script' && !data.script) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Script file is required',
            path: ['script'],
        });
    }
});

type FormData = z.infer<typeof formSchema>;

export function DashboardPage() {
    const navigate = useNavigate();
    const { data: pods, isLoading: podsLoading } = usePods();
    const submitMutation = useSubmitRequest();

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        clearErrors,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            databaseType: undefined,
            instanceId: '',
            databaseName: '',
            submissionType: 'query',
            query: '',
            script: null,
            comments: '',
            podId: '',
        },
    });

    const submissionType = watch('submissionType');
    const databaseType = watch('databaseType');
    const instanceId = watch('instanceId');
    const databaseName = watch('databaseName');
    const query = watch('query');
    const script = watch('script');

    const podOptions = (pods || []).map((pod) => ({
        value: pod.id,
        label: pod.name,
    }));

    const onSubmit = async (data: FormData) => {
        try {
            await submitMutation.mutateAsync({
                databaseType: data.databaseType as DatabaseType,
                instanceId: data.instanceId,
                databaseName: data.databaseName,
                submissionType: data.submissionType as SubmissionType,
                query: data.submissionType === 'query' ? data.query : undefined,
                script: data.submissionType === 'script' ? data.script! : undefined,
                comments: data.comments,
                podId: data.podId,
            });

            toast.success('Request submitted successfully!');
            navigate(ROUTES.SUBMISSIONS);
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to submit request';
            toast.error(message);
        }
    };

    const handleReset = () => {
        reset();
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Submit Query Request</h1>
                <p className="text-[#6B6B6B] mt-1">
                    Create a new database query or script execution request
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card animated>
                    <CardHeader>
                        <CardTitle>Request Details</CardTitle>
                        <CardDescription>
                            Fill in the details for your query or script execution request
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Database Selection */}
                        <DatabaseSelector
                            databaseType={databaseType || ''}
                            instanceId={instanceId}
                            databaseName={databaseName}
                            onDatabaseTypeChange={(type) => {
                                setValue('databaseType', type as typeof databaseType, { shouldValidate: true });
                                setValue('instanceId', '', { shouldValidate: false });
                                setValue('databaseName', '', { shouldValidate: false });
                                clearErrors(['instanceId', 'databaseName']);
                            }}
                            onInstanceChange={(id) => {
                                setValue('instanceId', id, { shouldValidate: true });
                                setValue('databaseName', '', { shouldValidate: false });
                                clearErrors('databaseName');
                            }}
                            onDatabaseChange={(name) => setValue('databaseName', name, { shouldValidate: true })}
                            errors={{
                                databaseType: errors.databaseType?.message,
                                instanceId: errors.instanceId?.message,
                                databaseName: errors.databaseName?.message,
                            }}
                        />

                        {/* Submission Type */}
                        <Controller
                            name="submissionType"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-black uppercase tracking-wide">
                                        Submission Type <span className="text-[#ef4444]">*</span>
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                value="query"
                                                checked={field.value === 'query'}
                                                onChange={() => {
                                                    field.onChange('query');
                                                    setValue('script', null);
                                                }}
                                                className="w-5 h-5 text-[#FEF34B] bg-white border-2 border-black focus:ring-[#FEF34B] focus:ring-offset-0 cursor-pointer"
                                            />
                                            <span className="text-sm font-medium text-black group-hover:text-[#5791FF] transition-colors">Query</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                value="script"
                                                checked={field.value === 'script'}
                                                onChange={() => {
                                                    field.onChange('script');
                                                    setValue('query', '');
                                                }}
                                                className="w-5 h-5 text-[#FEF34B] bg-white border-2 border-black focus:ring-[#FEF34B] focus:ring-offset-0 cursor-pointer"
                                            />
                                            <span className="text-sm font-medium text-black group-hover:text-[#5791FF] transition-colors">Script</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        />

                        {/* Query or Script Form */}
                        {submissionType === 'query' ? (
                            <QueryEditor
                                value={query || ''}
                                onChange={(q) => setValue('query', q, { shouldValidate: true })}
                                databaseType={databaseType || ''}
                                error={errors.query?.message}
                            />
                        ) : (
                            <ScriptForm
                                selectedFile={script || null}
                                onFileSelect={(file) => setValue('script', file, { shouldValidate: true })}
                                error={errors.script?.message}
                            />
                        )}

                        {/* Comments */}
                        <Controller
                            name="comments"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-black uppercase tracking-wide">
                                        Comments <span className="text-[#ef4444]">*</span>
                                    </label>
                                    <textarea
                                        {...field}
                                        placeholder="Describe what this query does and why it's needed..."
                                        className={`w-full px-3 py-2.5 bg-white border-2 rounded-md text-black placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#FEF34B] focus:ring-offset-1 transition-all duration-150 resize-none h-24 hover:shadow-[2px_2px_0_#000] focus:shadow-[2px_2px_0_#000] ${errors.comments ? 'border-[#ef4444]' : 'border-black'
                                            }`}
                                    />
                                    {errors.comments && (
                                        <p className="text-sm text-[#ef4444] font-medium">{errors.comments.message}</p>
                                    )}
                                </div>
                            )}
                        />

                        {/* POD Selection */}
                        <Controller
                            name="podId"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label="POD Name"
                                    placeholder="Select POD"
                                    options={podOptions}
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    isLoading={podsLoading}
                                    error={errors.podId?.message}
                                    required
                                />
                            )}
                        />
                    </CardContent>

                    <CardFooter>
                        <Button type="button" variant="secondary" onClick={handleReset}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={submitMutation.isPending}>
                            Submit Request
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

export default DashboardPage;
