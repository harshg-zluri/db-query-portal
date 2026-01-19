import { Request, Response, NextFunction } from 'express';
import { QueryRequestModel, CreateRequestData } from '../models/QueryRequest';
import { DatabaseInstanceModel } from '../models/DatabaseInstance';
import { PodModel } from '../models/Pod';
import { UserRole, SubmissionType, RequestStatus } from '../types';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/responseHelper';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { CreateRequestInput, ListRequestsInput } from '../validators/request.schema';
import { sanitizeFileName, getSecurityWarnings } from '../utils/sanitizer';
import { logger, AuditCategory, AuditAction } from '../utils/logger';
import { SlackNotificationType, sendSlackNotification } from '../services/slack.service';
import { config } from '../config/environment';
import { getPaginationParams } from '../utils/pagination';
import path from 'path';

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
        return forwarded[0];
    }
    return req.socket.remoteAddress || 'unknown';
}

/**
 * Request Controller
 * Handles query request submission and listing
 */
export class RequestController {
    /**
     * POST /api/requests
     * Submit new query/script request
     */
    static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        const user = req.user!;
        const ipAddress = getClientIp(req);

        try {
            const input = req.body as CreateRequestInput;

            // Validate instance exists
            const instance = await DatabaseInstanceModel.findById(input.instanceId);
            if (!instance) {
                throw new NotFoundError('Database instance');
            }

            // Validate database type matches
            if (instance.type !== input.databaseType) {
                throw new ValidationError('Database type mismatch with selected instance');
            }

            // Validate database exists in instance
            if (!instance.databases.includes(input.databaseName)) {
                throw new ValidationError('Database not found in selected instance');
            }

            // Validate POD exists
            const pod = await PodModel.findById(input.podId);
            if (!pod) {
                throw new NotFoundError('POD');
            }

            // Check request limit per user (abuse prevention)
            const pendingCount = await QueryRequestModel.countPendingByUser(user.userId);
            const maxAllowed = config.requestLimits.maxPendingPerUser;

            if (pendingCount >= maxAllowed) {
                res.status(429).json({
                    success: false,
                    error: 'Request limit exceeded',
                    message: `You have ${pendingCount} pending requests. Please wait for some to be processed.`,
                    details: {
                        currentCount: pendingCount,
                        maxAllowed
                    }
                });
                return;
            }

            // Handle script file if present
            let scriptContent: string | undefined;
            let scriptFileName: string | undefined;

            if (input.submissionType === SubmissionType.SCRIPT) {
                if (!req.file) {
                    throw new ValidationError('Script file is required for script submissions');
                }

                const fileExt = path.extname(req.file.originalname).toLowerCase();
                if (fileExt !== '.js') {
                    throw new ValidationError('Invalid file type. Only JavaScript (.js) files are allowed.');
                }

                scriptFileName = sanitizeFileName(req.file.originalname);
                scriptContent = req.file.buffer.toString('utf-8');
            }

            // Generate security warnings for the query/script content
            const contentToCheck = input.query || scriptContent || '';
            const warnings = getSecurityWarnings(contentToCheck);

            // Create request data
            const requestData: CreateRequestData = {
                userId: user.userId,
                userEmail: user.email,
                databaseType: input.databaseType,
                instanceId: input.instanceId,
                instanceName: instance.name,
                databaseName: input.databaseName,
                submissionType: input.submissionType,
                query: input.query,
                scriptFileName,
                scriptContent,
                comments: input.comments,
                podId: input.podId,
                podName: pod.name,
                warnings: warnings.length > 0 ? warnings : undefined
            };

            const request = await QueryRequestModel.create(requestData);

            // Audit log: request created
            logger.audit({
                category: AuditCategory.REQUEST,
                action: AuditAction.REQUEST_CREATED,
                message: `New ${input.submissionType} request created`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress,
                userAgent: req.headers['user-agent'],
                requestId: req.requestId,
                resourceId: request.id,
                resourceType: 'QueryRequest',
                outcome: 'SUCCESS',
                details: {
                    databaseType: input.databaseType,
                    instanceId: input.instanceId,
                    instanceName: instance.name,
                    databaseName: input.databaseName,
                    submissionType: input.submissionType,
                    podId: input.podId,
                    podName: pod.name,
                    hasScript: !!scriptFileName,
                    scriptFileName,
                    queryPreview: input.query?.substring(0, 100)
                }
            });

            // TODO: Week 2 - FR2.4: Send Slack notification to approval channel
            // This will notify managers in the approval channel about the new pending request
            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_SUBMITTED,
                request
            });

            sendCreated(res, request, 'Request submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/requests
     * List requests (filtered by role/POD access)
     */
    static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const query = req.query as unknown as ListRequestsInput;
            const user = req.user!;

            // Build filters based on user role
            const filters: {
                status?: RequestStatus;
                podId?: string;
                approverEmail?: string;
                dateFrom?: Date;
                dateTo?: Date;
                allowedPodIds?: string[];
            } = {
                status: query.status as RequestStatus,
                podId: query.podId,
                approverEmail: query.approverEmail,
                dateFrom: query.dateFrom,
                dateTo: query.dateTo
            };

            // Managers can only see requests for their PODs
            if (user.role === UserRole.MANAGER) {
                filters.allowedPodIds = user.managedPodIds;
            }

            // Developers shouldn't access this endpoint (they use /my)
            if (user.role === UserRole.DEVELOPER) {
                // Audit log: forbidden access
                logger.audit({
                    category: AuditCategory.ACCESS,
                    action: AuditAction.FORBIDDEN_ACCESS,
                    message: `Developer attempted to access manager/admin request list`,
                    userId: user.userId,
                    userEmail: user.email,
                    ipAddress: getClientIp(req),
                    requestId: req.requestId,
                    outcome: 'FAILURE',
                    details: { role: user.role }
                });
                throw new ForbiddenError('Use /api/requests/my to view your submissions');
            }

            const { page, limit } = getPaginationParams(req.query);

            const { requests, total } = await QueryRequestModel.findWithFilters(
                filters,
                page,
                limit
            );

            // Audit log: request list viewed
            logger.audit({
                category: AuditCategory.REQUEST,
                action: AuditAction.REQUEST_LIST_VIEWED,
                message: `Viewed request list`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress: getClientIp(req),
                requestId: req.requestId,
                outcome: 'SUCCESS',
                details: {
                    filters: {
                        status: filters.status,
                        podId: filters.podId
                    },
                    page: query.page,
                    limit: query.limit,
                    totalResults: total
                }
            });

            sendPaginated(res, requests, query.page, query.limit, total);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/requests/my
     * Get current user's submissions
     * Query params: page, limit, status (optional: pending/approved/executed/failed/rejected)
     */
    static async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user!;
            const { page, limit } = getPaginationParams(req.query);
            const status = req.query.status as RequestStatus | undefined;

            // Validate status if provided
            const validStatuses = ['pending', 'approved', 'rejected', 'executed', 'failed', 'withdrawn'];
            if (status && !validStatuses.includes(status)) {
                throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }

            const { requests, total } = await QueryRequestModel.findByUserId(
                user.userId,
                page,
                limit,
                status
            );

            // Audit log: my requests viewed
            logger.audit({
                category: AuditCategory.REQUEST,
                action: AuditAction.REQUEST_LIST_VIEWED,
                message: `User viewed their own requests`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress: getClientIp(req),
                requestId: req.requestId,
                outcome: 'SUCCESS',
                details: {
                    page,
                    limit,
                    status: status || 'all',
                    totalResults: total
                }
            });

            sendPaginated(res, requests, page, limit, total);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/requests/:id
     * Get request details
     */
    static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { id } = req.params;
        const user = req.user!;

        try {
            const request = await QueryRequestModel.findById(id);

            if (!request) {
                throw new NotFoundError('Request');
            }

            // Check access: Owner, POD manager, or admin
            const hasAccess =
                request.userId === user.userId ||
                user.role === UserRole.ADMIN ||
                (user.role === UserRole.MANAGER && user.managedPodIds.includes(request.podId));

            if (!hasAccess) {
                // Audit log: forbidden access
                logger.audit({
                    category: AuditCategory.ACCESS,
                    action: AuditAction.FORBIDDEN_ACCESS,
                    message: `User attempted to access request they don't have permission for`,
                    userId: user.userId,
                    userEmail: user.email,
                    ipAddress: getClientIp(req),
                    requestId: req.requestId,
                    resourceId: id,
                    resourceType: 'QueryRequest',
                    outcome: 'FAILURE',
                    details: {
                        userRole: user.role,
                        requestOwner: request.userEmail,
                        requestPod: request.podId
                    }
                });
                throw new ForbiddenError('You do not have access to this request');
            }

            // Audit log: request viewed
            logger.audit({
                category: AuditCategory.REQUEST,
                action: AuditAction.REQUEST_VIEWED,
                message: `Request details viewed`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress: getClientIp(req),
                requestId: req.requestId,
                resourceId: id,
                resourceType: 'QueryRequest',
                outcome: 'SUCCESS',
                details: {
                    requestStatus: request.status,
                    requestOwner: request.userEmail,
                    databaseType: request.databaseType
                }
            });

            sendSuccess(res, request);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/requests/:id/withdraw
     * Withdraw a pending request (only owner can withdraw)
     */
    static async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { id } = req.params;
        const user = req.user!;
        const ipAddress = getClientIp(req);

        try {
            // Try to withdraw (will fail if not owner or not pending)
            const withdrawnRequest = await QueryRequestModel.withdraw(id, user.userId);

            if (!withdrawnRequest) {
                // Check if request exists and give appropriate error
                const request = await QueryRequestModel.findById(id);

                if (!request) {
                    throw new NotFoundError('Request');
                }

                if (request.userId !== user.userId) {
                    throw new ForbiddenError('You can only withdraw your own requests');
                }

                if (request.status !== RequestStatus.PENDING) {
                    throw new ValidationError(`Cannot withdraw request with status: ${request.status}. Only pending requests can be withdrawn.`);
                }

                throw new ValidationError('Unable to withdraw request');
            }

            // Audit log: request withdrawn
            logger.audit({
                category: AuditCategory.REQUEST,
                action: AuditAction.REQUEST_WITHDRAWN,
                message: `Request withdrawn by owner`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress,
                requestId: req.requestId,
                resourceId: id,
                resourceType: 'QueryRequest',
                outcome: 'SUCCESS',
                details: {
                    previousStatus: 'pending',
                    newStatus: 'withdrawn'
                }
            });

            sendSuccess(res, withdrawnRequest, 'Request withdrawn successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/requests/:id/download-result
     * Download execution result (decompresses if needed)
     */
    static async downloadResult(req: Request, res: Response, next: NextFunction): Promise<void> {
        const user = req.user!;
        const { id } = req.params;

        try {
            const request = await QueryRequestModel.findById(id);
            if (!request) {
                throw new NotFoundError('Request');
            }

            // Authorization: owner or manager of the pod
            const isOwner = request.userId === user.userId;
            const isManager = user.role === UserRole.MANAGER && user.managedPodIds.includes(request.podId);
            const isAdmin = user.role === UserRole.ADMIN;

            if (!isOwner && !isManager && !isAdmin) {
                throw new ForbiddenError();
            }

            if (!request.executionResult) {
                throw new NotFoundError('Execution result not available');
            }

            let resultData = request.executionResult;

            // Decompress if needed
            if (request.isCompressed) {
                const { decompressResult } = await import('../utils/compression');
                resultData = await decompressResult(request.executionResult);
            }

            // Set headers for file download
            const filename = `result_${id}.json`;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(resultData);
        } catch (error) {
            next(error);
        }
    }
}

