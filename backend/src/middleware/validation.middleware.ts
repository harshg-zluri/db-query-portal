import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type RequestLocation = 'body' | 'query' | 'params';

/**
 * Validation middleware factory
 * Validates request data against Zod schema
 */
export function validate<T extends ZodSchema>(
    schema: T,
    location: RequestLocation = 'body'
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req[location];
            const validated = await schema.parseAsync(data);

            // Replace original data with validated/transformed data
            req[location] = validated;

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
                next(new ValidationError(messages.join(', ')));
                return;
            }
            next(error);
        }
    };
}

/**
 * Validate multiple locations at once
 */
export function validateMultiple(schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors: string[] = [];

            for (const [location, schema] of Object.entries(schemas)) {
                if (schema) {
                    try {
                        const data = req[location as RequestLocation];
                        const validated = await schema.parseAsync(data);
                        req[location as RequestLocation] = validated;
                    } catch (error) {
                        if (error instanceof z.ZodError) {
                            errors.push(...error.errors.map(e =>
                                `${location}.${e.path.join('.')}: ${e.message}`
                            ));
                        } else {
                            throw error;
                        }
                    }
                }
            }

            if (errors.length > 0) {
                next(new ValidationError(errors.join(', ')));
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}
