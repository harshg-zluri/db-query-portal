import { getEm } from '../config/database';
import { QueryRequest } from '../entities/QueryRequest';
import { RequestStatus, DatabaseType, SubmissionType } from '../types'; // Import original types for interface
import { FilterQuery } from '@mikro-orm/core';

// Re-export interface for compatibility
export interface CreateRequestData {
    userId: string;
    userEmail: string;
    databaseType: DatabaseType;
    instanceId: string;
    instanceName: string;
    databaseName: string;
    submissionType: SubmissionType;
    query?: string;
    scriptFileName?: string;
    scriptContent?: string;
    comments: string;
    podId: string;
    podName: string;
    warnings?: string[];
}

export interface ListRequestsFilters {
    status?: RequestStatus;
    podId?: string;
    approverEmail?: string;
    dateFrom?: Date;
    dateTo?: Date;
    allowedPodIds?: string[];
}

/**
 * Create new query request
 */
export async function createRequest(data: CreateRequestData): Promise<QueryRequest> {
    const em = getEm();
    const request = new QueryRequest();

    request.userId = data.userId;
    request.userEmail = data.userEmail;
    request.databaseType = data.databaseType;
    request.instanceId = data.instanceId;
    request.instanceName = data.instanceName;
    request.databaseName = data.databaseName;
    request.submissionType = data.submissionType;
    if (data.query) request.query = data.query;
    if (data.scriptFileName) request.scriptFileName = data.scriptFileName;
    if (data.scriptContent) request.scriptContent = data.scriptContent;
    request.comments = data.comments;
    request.podId = data.podId;
    request.podName = data.podName;
    if (data.warnings) request.warnings = data.warnings;

    await em.persistAndFlush(request);
    return request;
}

/**
 * Find request by ID
 */
export async function findRequestById(id: string): Promise<QueryRequest | null> {
    const em = getEm();
    return await em.findOne(QueryRequest, { id });
}

/**
 * Find requests by user ID with pagination and optional status filter
 */
export async function findRequestsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: RequestStatus
): Promise<{ requests: QueryRequest[]; total: number }> {
    const em = getEm();
    const offset = (page - 1) * limit;

    const where: FilterQuery<QueryRequest> = { userId };
    if (status) {
        where.status = status;
    }

    const [requests, total] = await em.findAndCount(QueryRequest, where, {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' }
    });

    return { requests, total };
}

/**
 * Count pending + approved requests for a user (for abuse prevention)
 */
export async function countPendingRequestsByUser(userId: string): Promise<number> {
    const em = getEm();
    return await em.count(QueryRequest, {
        userId,
        status: { $in: [RequestStatus.PENDING, RequestStatus.APPROVED] }
    });
}

/**
 * Find requests with filters and pagination
 */
export async function findRequestsWithFilters(
    filters: ListRequestsFilters,
    page: number = 1,
    limit: number = 20
): Promise<{ requests: QueryRequest[]; total: number }> {
    const em = getEm();
    const offset = (page - 1) * limit;

    const where: FilterQuery<QueryRequest> = {};

    if (filters.status) where.status = filters.status;
    if (filters.podId) where.podId = filters.podId;
    if (filters.approverEmail) where.approverEmail = filters.approverEmail;
    if (filters.allowedPodIds) where.podId = { $in: filters.allowedPodIds };

    if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.$gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.$lte = filters.dateTo;
    }

    const [requests, total] = await em.findAndCount(QueryRequest, where, {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' }
    });

    return { requests, total };
}

/**
 * Approve request
 */
export async function approveRequest(id: string, approverEmail: string): Promise<QueryRequest | null> {
    const em = getEm();
    const request = await em.findOne(QueryRequest, { id });

    if (!request) return null;

    request.status = RequestStatus.APPROVED;
    request.approverEmail = approverEmail;
    request.updatedAt = new Date();

    await em.flush();
    return request;
}

/**
 * Reject request
 */
export async function rejectRequest(
    id: string,
    approverEmail: string,
    reason?: string
): Promise<QueryRequest | null> {
    const em = getEm();
    const request = await em.findOne(QueryRequest, { id });

    if (!request) return null;

    request.status = RequestStatus.REJECTED;
    request.approverEmail = approverEmail;
    if (reason) request.rejectionReason = reason;
    request.updatedAt = new Date();

    await em.flush();
    return request;
}

/**
 * Withdraw request (only owner can withdraw their own pending request)
 */
export async function withdrawRequest(
    id: string,
    userId: string
): Promise<QueryRequest | null> {
    const em = getEm();
    const request = await em.findOne(QueryRequest, {
        id,
        userId,
        status: RequestStatus.PENDING
    });

    if (!request) return null;

    request.status = RequestStatus.WITHDRAWN;
    request.updatedAt = new Date();

    await em.flush();
    return request;
}

/**
 * Set execution result
 */
export async function setRequestExecutionResult(
    id: string,
    success: boolean,
    result?: string,
    error?: string,
    isCompressed?: boolean
): Promise<QueryRequest | null> {
    const em = getEm();
    const request = await em.findOne(QueryRequest, { id });

    if (!request) return null;

    request.status = success ? RequestStatus.EXECUTED : RequestStatus.FAILED;
    if (result) request.executionResult = result;
    if (error) request.executionError = error;
    if (isCompressed !== undefined) request.isCompressed = isCompressed;
    request.executedAt = new Date();
    request.updatedAt = new Date();

    await em.flush();
    return request;
}


