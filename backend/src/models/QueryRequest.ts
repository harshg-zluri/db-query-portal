import { prisma } from '../config/database';
import { QueryRequest, RequestStatus, DatabaseType, SubmissionType } from '../types';

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

// Transform Prisma result to QueryRequest object
function toQueryRequest(row: {
    id: string;
    userId: string;
    userEmail: string;
    databaseType: string;
    instanceId: string;
    instanceName: string;
    databaseName: string;
    submissionType: string;
    query: string | null;
    scriptFileName: string | null;
    scriptContent: string | null;
    comments: string;
    podId: string;
    podName: string;
    status: string;
    approverEmail: string | null;
    rejectionReason: string | null;
    executionResult: string | null;
    executionError: string | null;
    warnings: string[];
    createdAt: Date;
    updatedAt: Date;
    executedAt: Date | null;
}): QueryRequest {
    return {
        id: row.id,
        userId: row.userId,
        userEmail: row.userEmail,
        databaseType: row.databaseType as DatabaseType,
        instanceId: row.instanceId,
        instanceName: row.instanceName,
        databaseName: row.databaseName,
        submissionType: row.submissionType as SubmissionType,
        query: row.query || undefined,
        scriptFileName: row.scriptFileName || undefined,
        scriptContent: row.scriptContent || undefined,
        comments: row.comments,
        podId: row.podId,
        podName: row.podName,
        status: row.status as RequestStatus,
        approverEmail: row.approverEmail || undefined,
        rejectionReason: row.rejectionReason || undefined,
        executionResult: row.executionResult || undefined,
        executionError: row.executionError || undefined,
        warnings: row.warnings || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        executedAt: row.executedAt || undefined
    };
}

export class QueryRequestModel {
    /**
     * Create new query request
     */
    static async create(data: CreateRequestData): Promise<QueryRequest> {
        const request = await prisma.queryRequest.create({
            data: {
                userId: data.userId,
                userEmail: data.userEmail,
                databaseType: data.databaseType,
                instanceId: data.instanceId,
                instanceName: data.instanceName,
                databaseName: data.databaseName,
                submissionType: data.submissionType,
                query: data.query || null,
                scriptFileName: data.scriptFileName || null,
                scriptContent: data.scriptContent || null,
                comments: data.comments,
                podId: data.podId,
                podName: data.podName,
                status: RequestStatus.PENDING,
                warnings: data.warnings || []
            }
        });

        return toQueryRequest(request);
    }

    /**
     * Find request by ID
     */
    static async findById(id: string): Promise<QueryRequest | null> {
        const request = await prisma.queryRequest.findUnique({
            where: { id }
        });

        return request ? toQueryRequest(request) : null;
    }

    /**
     * Find requests by user ID with pagination and optional status filter
     */
    static async findByUserId(
        userId: string,
        page: number = 1,
        limit: number = 20,
        status?: RequestStatus
    ): Promise<{ requests: QueryRequest[]; total: number }> {
        const skip = (page - 1) * limit;

        const whereClause = status
            ? { userId, status }
            : { userId };

        const [requests, total] = await Promise.all([
            prisma.queryRequest.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma.queryRequest.count({ where: whereClause })
        ]);

        return {
            requests: requests.map(toQueryRequest),
            total
        };
    }

    /**
     * Count pending + approved requests for a user (for abuse prevention)
     */
    static async countPendingByUser(userId: string): Promise<number> {
        return prisma.queryRequest.count({
            where: {
                userId,
                status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] }
            }
        });
    }

    /**
     * Find requests with filters and pagination
     */
    static async findWithFilters(
        filters: ListRequestsFilters,
        page: number = 1,
        limit: number = 20
    ): Promise<{ requests: QueryRequest[]; total: number }> {
        const skip = (page - 1) * limit;

        // Build where clause dynamically
        const whereClause: Record<string, unknown> = {};

        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.podId) {
            whereClause.podId = filters.podId;
        }
        if (filters.approverEmail) {
            whereClause.approverEmail = filters.approverEmail;
        }
        if (filters.allowedPodIds && filters.allowedPodIds.length > 0) {
            whereClause.podId = { in: filters.allowedPodIds };
        }
        if (filters.dateFrom || filters.dateTo) {
            whereClause.createdAt = {};
            if (filters.dateFrom) {
                (whereClause.createdAt as Record<string, Date>).gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                (whereClause.createdAt as Record<string, Date>).lte = filters.dateTo;
            }
        }

        const [requests, total] = await Promise.all([
            prisma.queryRequest.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma.queryRequest.count({ where: whereClause })
        ]);

        return {
            requests: requests.map(toQueryRequest),
            total
        };
    }

    /**
     * Approve request
     */
    static async approve(id: string, approverEmail: string): Promise<QueryRequest | null> {
        try {
            const request = await prisma.queryRequest.update({
                where: { id },
                data: {
                    status: RequestStatus.APPROVED,
                    approverEmail
                }
            });

            return toQueryRequest(request);
        } catch {
            return null;
        }
    }

    /**
     * Reject request
     */
    static async reject(
        id: string,
        approverEmail: string,
        reason?: string
    ): Promise<QueryRequest | null> {
        try {
            const request = await prisma.queryRequest.update({
                where: { id },
                data: {
                    status: RequestStatus.REJECTED,
                    approverEmail,
                    rejectionReason: reason || null
                }
            });

            return toQueryRequest(request);
        } catch {
            return null;
        }
    }

    /**
     * Withdraw request (only owner can withdraw their own pending request)
     */
    static async withdraw(
        id: string,
        userId: string
    ): Promise<QueryRequest | null> {
        try {
            const request = await prisma.queryRequest.updateMany({
                where: {
                    id,
                    userId,
                    status: RequestStatus.PENDING
                },
                data: {
                    status: RequestStatus.WITHDRAWN
                }
            });

            if (request.count === 0) {
                return null;
            }

            // Fetch the updated record
            return this.findById(id);
        } catch {
            return null;
        }
    }

    /**
     * Set execution result
     */
    static async setExecutionResult(
        id: string,
        success: boolean,
        result?: string,
        error?: string
    ): Promise<QueryRequest | null> {
        const status = success ? RequestStatus.EXECUTED : RequestStatus.FAILED;

        try {
            const request = await prisma.queryRequest.update({
                where: { id },
                data: {
                    status,
                    executionResult: result || null,
                    executionError: error || null,
                    executedAt: new Date()
                }
            });

            return toQueryRequest(request);
        } catch {
            return null;
        }
    }
}
