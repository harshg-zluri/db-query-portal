import { getPaginationParams } from '../../../src/utils/pagination';
import { ValidationError } from '../../../src/utils/errors';

describe('Pagination Utils', () => {
    describe('getPaginationParams', () => {
        it('should return default values if no query provided', () => {
            const result = getPaginationParams({});
            expect(result).toEqual({ page: 1, limit: 20 });
        });

        it('should use provided custom options for defaults', () => {
            const result = getPaginationParams({}, { defaultLimit: 50 });
            expect(result).toEqual({ page: 1, limit: 50 });
        });

        it('should parse valid page and limit', () => {
            const result = getPaginationParams({ page: '2', limit: '10' });
            expect(result).toEqual({ page: 2, limit: 10 });
        });

        it('should handle number inputs for page and limit', () => {
            const result = getPaginationParams({ page: 3, limit: 15 });
            expect(result).toEqual({ page: 3, limit: 15 });
        });

        it('should throw ValidationError for invalid page number', () => {
            expect(() => getPaginationParams({ page: 'invalid' })).toThrow(ValidationError);
            expect(() => getPaginationParams({ page: '0' })).toThrow(ValidationError);
            expect(() => getPaginationParams({ page: '-1' })).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid limit number', () => {
            expect(() => getPaginationParams({ limit: 'invalid' })).toThrow(ValidationError);
            expect(() => getPaginationParams({ limit: '0' })).toThrow(ValidationError);
            expect(() => getPaginationParams({ limit: '-1' })).toThrow(ValidationError);
        });

        it('should throw ValidationError if limit exceeds maxLimit', () => {
            expect(() => getPaginationParams({ limit: '101' })).toThrow(ValidationError); // Default max is 100
            expect(() => getPaginationParams({ limit: '60' }, { maxLimit: 50 })).toThrow(ValidationError);
        });

        it('should floor decimal page and limit', () => {
            const result = getPaginationParams({ page: '2.5', limit: '10.9' });
            expect(result).toEqual({ page: 2, limit: 10 });
        });
    });
});
