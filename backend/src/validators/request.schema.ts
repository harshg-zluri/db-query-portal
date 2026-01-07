import { z } from 'zod';
import { DatabaseType, SubmissionType } from '../types';

// Query request submission schema
export const createRequestSchema = z.object({
    databaseType: z.nativeEnum(DatabaseType, {
        errorMap: () => ({ message: 'Database type must be postgresql or mongodb' })
    }),
    instanceId: z
        .string()
        .uuid('Invalid instance ID format'),
    databaseName: z
        .string()
        .min(1, 'Database name is required')
        .max(100, 'Database name too long')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Database name contains invalid characters'),
    submissionType: z.nativeEnum(SubmissionType, {
        errorMap: () => ({ message: 'Submission type must be query or script' })
    }),
    query: z
        .string()
        .max(50000, 'Query too long')
        .optional(),
    comments: z
        .string()
        .min(1, 'Comments are required')
        .max(5000, 'Comments too long'),
    podId: z
        .string()
        .min(1, 'POD is required')
}).refine(
    (data) => {
        // If submission type is query, query field must be provided
        if (data.submissionType === SubmissionType.QUERY) {
            return data.query && data.query.trim().length > 0;
        }
        return true;
    },
    {
        message: 'Query is required when submission type is "query"',
        path: ['query']
    }
);

// List requests query params schema
export const listRequestsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().optional(),
    podId: z.string().optional(),
    approverEmail: z.string().email().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    search: z.string().max(200).optional()
});

// Reject request schema
export const rejectRequestSchema = z.object({
    reason: z
        .string()
        .max(1000, 'Rejection reason too long')
        .optional()
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListRequestsInput = z.infer<typeof listRequestsSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
