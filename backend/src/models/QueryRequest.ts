import { query } from '../config/database';
import { QueryRequest, RequestStatus, DatabaseType, SubmissionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

// SQL queries with parameterized inputs
const SQL = {
    create: `
    INSERT INTO query_requests (
      id, user_id, user_email, database_type, instance_id, instance_name,
      database_name, submission_type, query, script_file_name, script_content,
      comments, pod_id, pod_name, status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
    RETURNING *
  `,
    findById: `
    SELECT * FROM query_requests WHERE id = $1
  `,
    findByUserId: `
    SELECT * FROM query_requests 
    WHERE user_id = $1 
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,
    findByUserIdWithStatus: `
    SELECT * FROM query_requests 
    WHERE user_id = $1 AND status = $2
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `,
    countByUserId: `
    SELECT COUNT(*) as total FROM query_requests WHERE user_id = $1
  `,
    countByUserIdWithStatus: `
    SELECT COUNT(*) as total FROM query_requests WHERE user_id = $1 AND status = $2
  `,
    findPending: `
    SELECT * FROM query_requests 
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,
    findPendingByPods: `
    SELECT * FROM query_requests 
    WHERE status = 'pending' AND pod_id = ANY($1::text[])
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,
    countPending: `
    SELECT COUNT(*) as total FROM query_requests WHERE status = 'pending'
  `,
    countPendingByPods: `
    SELECT COUNT(*) as total FROM query_requests 
    WHERE status = 'pending' AND pod_id = ANY($1::text[])
  `,
    countPendingByUser: `
    SELECT COUNT(*) as total FROM query_requests 
    WHERE user_id = $1 AND status IN ('pending', 'approved')
  `,
    updateStatus: `
    UPDATE query_requests 
    SET status = $2, approver_email = $3, updated_at = $4
    WHERE id = $1
    RETURNING *
  `,
    reject: `
    UPDATE query_requests 
    SET status = 'rejected', approver_email = $2, rejection_reason = $3, updated_at = $4
    WHERE id = $1
    RETURNING *
  `,
    withdraw: `
    UPDATE query_requests 
    SET status = 'withdrawn', updated_at = $2
    WHERE id = $1 AND user_id = $3 AND status = 'pending'
    RETURNING *
  `,
    setExecutionResult: `
    UPDATE query_requests 
    SET status = $2, execution_result = $3, execution_error = $4, 
        executed_at = $5, updated_at = $5
    WHERE id = $1
    RETURNING *
  `,
    findWithFilters: `
    SELECT * FROM query_requests 
    WHERE 1=1
    AND ($1::text IS NULL OR status = $1)
    AND ($2::text IS NULL OR pod_id = $2)
    AND ($3::text IS NULL OR approver_email = $3)
    AND ($4::timestamp IS NULL OR created_at >= $4)
    AND ($5::timestamp IS NULL OR created_at <= $5)
    AND ($6::text[] IS NULL OR pod_id = ANY($6::text[]))
    ORDER BY created_at DESC
    LIMIT $7 OFFSET $8
  `,
    countWithFilters: `
    SELECT COUNT(*) as total FROM query_requests 
    WHERE 1=1
    AND ($1::text IS NULL OR status = $1)
    AND ($2::text IS NULL OR pod_id = $2)
    AND ($3::text IS NULL OR approver_email = $3)
    AND ($4::timestamp IS NULL OR created_at >= $4)
    AND ($5::timestamp IS NULL OR created_at <= $5)
    AND ($6::text[] IS NULL OR pod_id = ANY($6::text[]))
  `
};

function rowToRequest(row: Record<string, unknown>): QueryRequest {
    return {
        id: row.id as string,
        userId: row.user_id as string,
        userEmail: row.user_email as string,
        databaseType: row.database_type as DatabaseType,
        instanceId: row.instance_id as string,
        instanceName: row.instance_name as string,
        databaseName: row.database_name as string,
        submissionType: row.submission_type as SubmissionType,
        query: row.query as string | undefined,
        scriptFileName: row.script_file_name as string | undefined,
        scriptContent: row.script_content as string | undefined,
        comments: row.comments as string,
        podId: row.pod_id as string,
        podName: row.pod_name as string,
        status: row.status as RequestStatus,
        approverEmail: row.approver_email as string | undefined,
        rejectionReason: row.rejection_reason as string | undefined,
        executionResult: row.execution_result as string | undefined,
        executionError: row.execution_error as string | undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        executedAt: row.executed_at ? new Date(row.executed_at as string) : undefined
    };
}

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
}

export interface ListRequestsFilters {
    status?: RequestStatus;
    podId?: string;
    approverEmail?: string;
    dateFrom?: Date;
    dateTo?: Date;
    allowedPodIds?: string[];
}

export class QueryRequestModel {
    /**
     * Create new query request
     */
    static async create(data: CreateRequestData): Promise<QueryRequest> {
        const id = uuidv4();
        const now = new Date();

        const result = await query<Record<string, unknown>>(SQL.create, [
            id,
            data.userId,
            data.userEmail,
            data.databaseType,
            data.instanceId,
            data.instanceName,
            data.databaseName,
            data.submissionType,
            data.query || null,
            data.scriptFileName || null,
            data.scriptContent || null,
            data.comments,
            data.podId,
            data.podName,
            RequestStatus.PENDING,
            now
        ]);

        return rowToRequest(result.rows[0]);
    }

    /**
     * Find request by ID
     */
    static async findById(id: string): Promise<QueryRequest | null> {
        const result = await query<Record<string, unknown>>(SQL.findById, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToRequest(result.rows[0]);
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
        const offset = (page - 1) * limit;

        let requestsResult;
        let countResult;

        if (status) {
            // Filter by status
            [requestsResult, countResult] = await Promise.all([
                query<Record<string, unknown>>(SQL.findByUserIdWithStatus, [userId, status, limit, offset]),
                query<{ total: string }>(SQL.countByUserIdWithStatus, [userId, status])
            ]);
        } else {
            // No status filter
            [requestsResult, countResult] = await Promise.all([
                query<Record<string, unknown>>(SQL.findByUserId, [userId, limit, offset]),
                query<{ total: string }>(SQL.countByUserId, [userId])
            ]);
        }

        return {
            requests: requestsResult.rows.map(rowToRequest),
            total: parseInt(countResult.rows[0].total, 10)
        };
    }

    /**
     * Count pending + approved requests for a user (for abuse prevention)
     */
    static async countPendingByUser(userId: string): Promise<number> {
        const result = await query<{ total: string }>(SQL.countPendingByUser, [userId]);
        return parseInt(result.rows[0].total, 10);
    }

    /**
     * Find requests with filters and pagination
     */
    static async findWithFilters(
        filters: ListRequestsFilters,
        page: number = 1,
        limit: number = 20
    ): Promise<{ requests: QueryRequest[]; total: number }> {
        const offset = (page - 1) * limit;

        const params = [
            filters.status || null,
            filters.podId || null,
            filters.approverEmail || null,
            filters.dateFrom || null,
            filters.dateTo || null,
            filters.allowedPodIds || null,
            limit,
            offset
        ];

        const countParams = params.slice(0, 6);

        const [requestsResult, countResult] = await Promise.all([
            query<Record<string, unknown>>(SQL.findWithFilters, params),
            query<{ total: string }>(SQL.countWithFilters, countParams)
        ]);

        return {
            requests: requestsResult.rows.map(rowToRequest),
            total: parseInt(countResult.rows[0].total, 10)
        };
    }

    /**
     * Approve request
     */
    static async approve(id: string, approverEmail: string): Promise<QueryRequest | null> {
        const result = await query<Record<string, unknown>>(SQL.updateStatus, [
            id,
            RequestStatus.APPROVED,
            approverEmail,
            new Date()
        ]);

        if (result.rows.length === 0) {
            return null;
        }
        return rowToRequest(result.rows[0]);
    }

    /**
     * Reject request
     */
    static async reject(
        id: string,
        approverEmail: string,
        reason?: string
    ): Promise<QueryRequest | null> {
        const result = await query<Record<string, unknown>>(SQL.reject, [
            id,
            approverEmail,
            reason || null,
            new Date()
        ]);

        if (result.rows.length === 0) {
            return null;
        }
        return rowToRequest(result.rows[0]);
    }

    /**
     * Withdraw request (only owner can withdraw their own pending request)
     */
    static async withdraw(
        id: string,
        userId: string
    ): Promise<QueryRequest | null> {
        const result = await query<Record<string, unknown>>(SQL.withdraw, [
            id,
            new Date(),
            userId
        ]);

        if (result.rows.length === 0) {
            return null;
        }
        return rowToRequest(result.rows[0]);
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

        const dbResult = await query<Record<string, unknown>>(SQL.setExecutionResult, [
            id,
            status,
            result || null,
            error || null,
            new Date()
        ]);

        if (dbResult.rows.length === 0) {
            return null;
        }
        return rowToRequest(dbResult.rows[0]);
    }
}
