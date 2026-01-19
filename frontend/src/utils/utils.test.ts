import { describe, it, expect } from 'vitest';
import { cn } from './cn';
import { formatDate, formatDateShort, formatRelativeTime } from './format-date';
import { scriptRequestSchema } from './schemas';
import { ROUTES } from '../constants/routes';

describe('Utils', () => {
    describe('cn (clsx + tailwind-merge)', () => {
        it('should merge classes', () => {
            expect(cn('c1', 'c2')).toBe('c1 c2');
        });

        it('should handle conditionals', () => {
            expect(cn('c1', true && 'c2', false && 'c3')).toBe('c1 c2');
        });

        it('should merge tailwind classes', () => {
            // tailwind-merge should resolve conflict
            expect(cn('p-4 px-2')).toBe('p-4 px-2'); // both applying? wait
            // better example:
            expect(cn('px-2 py-2 px-4')).toBe('py-2 px-4');
        });
    });

    describe('formatDate', () => {
        const testDate = new Date('2023-01-01T12:00:00Z'); // UTC

        it('should format full date', () => {
            // Note: Output depends on local timezone of runner (JSDOM uses consistent locale usually)
            // Using toLocaleString logic in implementation
            // expected: "Jan 1, 2023, 12:00 PM" (if en-US)
            // But if running in different TZ, it might shift.
            // For now, check structure.
            const result = formatDate(testDate.toISOString());
            expect(result).toMatch(/Jan 1, 2023/);
        });
    });

    describe('formatDateShort', () => {
        const testDate = new Date('2023-01-01T12:00:00Z');

        it('should format short date', () => {
            const result = formatDateShort(testDate.toISOString());
            expect(result).toMatch(/Jan 1/);
        });
    });

    describe('formatRelativeTime', () => {
        it('should return "Just now" for recent times', () => {
            const now = new Date();
            const result = formatRelativeTime(now.toISOString());
            expect(result).toBe('Just now');
        });

        it('should return minutes ago', () => {
            const date = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
            const result = formatRelativeTime(date.toISOString());
            expect(result).toBe('5m ago');
        });

        it('should return hours ago', () => {
            const date = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
            const result = formatRelativeTime(date.toISOString());
            expect(result).toBe('2h ago');
        });

        it('should return days ago', () => {
            const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
            const result = formatRelativeTime(date.toISOString());
            expect(result).toBe('3d ago');
        });

        it('should fallback to short date for > 7 days', () => {
            const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
            const result = formatRelativeTime(date.toISOString());
            // Should match short date format
            expect(result).not.toContain('ago');
            expect(result).toMatch(/[a-zA-Z]{3} \d+/);
        });
    });

    describe('Schemas', () => {
        // Mock File object if not present (JSDOM usually has it)

        it('should validate script file extension', () => {
            const jsFile = new File(['content'], 'script.js', { type: 'text/javascript' });
            const pyFile = new File(['content'], 'script.py', { type: 'text/x-python' });

            // Testing the refinement logic specifically
            // We need to create a valid base object first
            const baseData = {
                databaseType: 'postgresql',
                instanceId: 'inst1',
                databaseName: 'db1',
                comments: 'test',
                podId: 'pod1',
                submissionType: 'script',
                script: jsFile
            };

            const resultValid = scriptRequestSchema.safeParse(baseData);
            expect(resultValid.success).toBe(true);

            const resultInvalid = scriptRequestSchema.safeParse({ ...baseData, script: pyFile });
            expect(resultInvalid.success).toBe(false);
            if (!resultInvalid.success) {
                expect(resultInvalid.error.issues[0].message).toBe('Script must be a .js file');
            }
        });
    });

    describe('Routes', () => {
        it('should generate request detail route', () => {
            expect(ROUTES.REQUEST_DETAIL('123')).toBe('/requests/123');
        });
    });
});
