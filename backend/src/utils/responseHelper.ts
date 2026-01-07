import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export function sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
): void {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message
    };
    res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
    sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
): void {
    const response: PaginatedResponse<T> = {
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
    res.status(200).json(response);
}

export function sendError(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: string
): void {
    const response: ApiResponse = {
        success: false,
        error: message
    };
    res.status(statusCode).json(response);
}
