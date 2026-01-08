import { z } from 'zod';

// =============================================================================
// Auth Schemas
// =============================================================================

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Invalid email format'),
    password: z
        .string()
        .min(1, 'Password is required')
        .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// =============================================================================
// Query Request Schemas
// =============================================================================

export const databaseTypeSchema = z.enum(['postgresql', 'mongodb'], {
    message: 'Database type is required',
});

export const submissionTypeSchema = z.enum(['query', 'script'], {
    message: 'Submission type is required',
});

// Base schema for common fields
const baseRequestSchema = z.object({
    databaseType: databaseTypeSchema,
    instanceId: z.string().min(1, 'Instance is required'),
    databaseName: z.string().min(1, 'Database is required'),
    comments: z.string().min(1, 'Comments are required'),
    podId: z.string().min(1, 'POD is required'),
});

// Schema for query submission
export const queryRequestSchema = baseRequestSchema.extend({
    submissionType: z.literal('query'),
    query: z.string().min(1, 'Query is required'),
});

// Schema for script submission
export const scriptRequestSchema = baseRequestSchema.extend({
    submissionType: z.literal('script'),
    script: z
        .instanceof(File, { message: 'Script file is required' })
        .refine((file) => file.name.endsWith('.js'), {
            message: 'Script must be a .js file',
        }),
});

// Combined schema using discriminated union
export const querySubmissionSchema = z.discriminatedUnion('submissionType', [
    queryRequestSchema,
    scriptRequestSchema,
]);

export type QueryFormData = z.infer<typeof queryRequestSchema>;
export type ScriptFormData = z.infer<typeof scriptRequestSchema>;
export type SubmissionFormData = z.infer<typeof querySubmissionSchema>;
