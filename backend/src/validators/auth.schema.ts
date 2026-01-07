import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
    email: z
        .string()
        .email('Invalid email format')
        .max(255, 'Email too long'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long')
});

// Refresh token schema
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
