import { z } from 'zod';

// UUID param schema
export const uuidParamSchema = z.object({
    id: z.string().uuid('Invalid ID format')
});

// Pagination schema
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Instance filter schema
export const instanceFilterSchema = z.object({
    type: z.enum(['postgresql', 'mongodb']).optional()
});

export type UuidParam = z.infer<typeof uuidParamSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type InstanceFilterInput = z.infer<typeof instanceFilterSchema>;
