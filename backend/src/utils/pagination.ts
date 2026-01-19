import { ValidationError } from './errors';

interface PaginationParams {
    page: number;
    limit: number;
}

interface PaginationOptions {
    defaultLimit?: number;
    maxLimit?: number;
}

export function getPaginationParams(
    query: { page?: string | number; limit?: string | number },
    options: PaginationOptions = {}
): PaginationParams {
    const { defaultLimit = 20, maxLimit = 100 } = options;

    let page = 1;
    if (query.page !== undefined) {
        const parsedPage = Number(query.page);
        if (isNaN(parsedPage) || parsedPage < 1) {
            throw new ValidationError('Invalid page number. Page must be a positive integer.');
        }
        page = Math.floor(parsedPage);
    }

    let limit = defaultLimit;
    if (query.limit !== undefined) {
        const parsedLimit = Number(query.limit);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
            throw new ValidationError('Invalid limit number. Limit must be a positive integer.');
        }
        limit = Math.floor(parsedLimit);
    }

    if (limit > maxLimit) {
        throw new ValidationError(`Limit cannot exceed ${maxLimit}.`);
    }

    return { page, limit };
}
