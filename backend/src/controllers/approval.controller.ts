import { Request, Response, NextFunction } from 'express';
import { QueryRequestModel } from '../models/QueryRequest';
import { ExecutionService } from '../services/execution.service';
import { UserRole, RequestStatus } from '../types';
import { sendSuccess, sendPaginated } from '../utils/responseHelper';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { RejectRequestInput } from '../validators/request.schema';
import { logger, AuditCategory, AuditAction } from '../utils/logger';
import { SlackService, SlackNotificationType, sendSlackNotification } from '../services/slack.service';
import { getPaginationParams } from '../utils/pagination';

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
 * Approval Controller
 * Handles approve and reject workflows
 */
export class ApprovalController {
    /**
     * POST /api/requests/:id/approve
     * Approve a request and trigger execution
     */
    static async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { id } = req.params;
        const user = req.user!;
        const ipAddress = getClientIp(req);

        try {
            // Get request
            const request = await QueryRequestModel.findById(id);

            if (!request) {
                throw new NotFoundError('Request');
            }

            // Validate status
            if (request.status !== RequestStatus.PENDING) {
                throw new ValidationError(`Cannot approve request with status: ${request.status}`);
            }

            // Check POD access for managers
            if (user.role === UserRole.MANAGER && !user.managedPodIds.includes(request.podId)) {
                // Audit log: forbidden access attempt
                logger.audit({
                    category: AuditCategory.ACCESS,
                    action: AuditAction.FORBIDDEN_ACCESS,
                    message: `Manager attempted to approve request outside their POD`,
                    userId: user.userId,
                    userEmail: user.email,
                    ipAddress,
                    requestId: req.requestId,
                    resourceId: id,
                    resourceType: 'QueryRequest',
                    outcome: 'FAILURE',
                    details: {
                        userPods: user.managedPodIds,
                        requestPod: request.podId
                    }
                });
                throw new ForbiddenError('You can only approve requests for your PODs');
            }

            // Approve the request
            const approvedRequest = await QueryRequestModel.approve(id, user.email);

            if (!approvedRequest) {
                throw new NotFoundError('Request');
            }

            // Execute the query/script
            const executionResult = await ExecutionService.executeRequest(approvedRequest);

            // Audit log: request approved
            logger.audit({
                category: AuditCategory.APPROVAL,
                action: AuditAction.REQUEST_APPROVED,
                message: `Request approved and ${executionResult.success ? 'executed successfully' : 'execution failed'}`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress,
                requestId: req.requestId,
                resourceId: id,
                resourceType: 'QueryRequest',
                outcome: executionResult.success ? 'SUCCESS' : 'FAILURE',
                details: {
                    requesterId: request.userId,
                    requesterEmail: request.userEmail,
                    podId: request.podId,
                    podName: request.podName,
                    databaseType: request.databaseType,
                    instanceId: request.instanceId,
                    databaseName: request.databaseName,
                    submissionType: request.submissionType,
                    executionSuccess: executionResult.success,
                    rowCount: executionResult.rowCount
                }
            });

            // Audit log: execution result
            logger.audit({
                category: AuditCategory.EXECUTION,
                action: executionResult.success ? AuditAction.QUERY_EXECUTED : AuditAction.EXECUTION_FAILED,
                message: executionResult.success
                    ? `Query/script executed successfully`
                    : `Query/script execution failed: ${executionResult.error}`,
                userId: request.userId,
                userEmail: request.userEmail,
                ipAddress,
                requestId: req.requestId,
                resourceId: id,
                resourceType: 'QueryRequest',
                outcome: executionResult.success ? 'SUCCESS' : 'FAILURE',
                details: {
                    approvedBy: user.email,
                    rowCount: executionResult.rowCount,
                    error: executionResult.error
                }
            });

            // Get updated request with execution result
            const finalRequest = await QueryRequestModel.findById(id);

            // TODO: Week 2 - FR4.1: Send Slack notifications on approval
            // - DM to requester with execution results
            // - Message to approval channel with results
            await sendSlackNotification({
                type: executionResult.success
                    ? SlackNotificationType.EXECUTION_SUCCESS
                    : SlackNotificationType.EXECUTION_FAILED,
                request: approvedRequest,
                approverEmail: user.email,
                executionResult: {
                    success: executionResult.success,
                    rowCount: executionResult.rowCount,
                    output: executionResult.output,
                    error: executionResult.error,
                    isCompressed: executionResult.isCompressed,
                    originalSize: executionResult.originalSize
                }
            });

            sendSuccess(res, {
                request: finalRequest,
                execution: executionResult
            }, executionResult.success ? 'Request approved and executed successfully' : 'Request approved but execution failed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/requests/:id/reject
     * Reject a request with optional reason
     */
    static async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { id } = req.params;
        const { reason } = req.body as RejectRequestInput;
        const user = req.user!;
        const ipAddress = getClientIp(req);

        try {
            // Get request
            const request = await QueryRequestModel.findById(id);

            if (!request) {
                throw new NotFoundError('Request');
            }

            // Validate status
            if (request.status !== RequestStatus.PENDING) {
                throw new ValidationError(`Cannot reject request with status: ${request.status}`);
            }

            // Check POD access for managers
            if (user.role === UserRole.MANAGER && !user.managedPodIds.includes(request.podId)) {
                // Audit log: forbidden access attempt
                logger.audit({
                    category: AuditCategory.ACCESS,
                    action: AuditAction.FORBIDDEN_ACCESS,
                    message: `Manager attempted to reject request outside their POD`,
                    userId: user.userId,
                    userEmail: user.email,
                    ipAddress,
                    requestId: req.requestId,
                    resourceId: id,
                    resourceType: 'QueryRequest',
                    outcome: 'FAILURE',
                    details: {
                        userPods: user.managedPodIds,
                        requestPod: request.podId
                    }
                });
                throw new ForbiddenError('You can only reject requests for your PODs');
            }

            // Reject the request
            const rejectedRequest = await QueryRequestModel.reject(id, user.email, reason);

            if (!rejectedRequest) {
                throw new NotFoundError('Request');
            }

            // Audit log: request rejected
            logger.audit({
                category: AuditCategory.APPROVAL,
                action: AuditAction.REQUEST_REJECTED,
                message: `Request rejected${reason ? ': ' + reason : ''}`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress,
                requestId: req.requestId,
                resourceId: id,
                resourceType: 'QueryRequest',
                outcome: 'SUCCESS',
                details: {
                    requesterId: request.userId,
                    requesterEmail: request.userEmail,
                    podId: request.podId,
                    podName: request.podName,
                    reason: reason || 'No reason provided',
                    databaseType: request.databaseType,
                    instanceId: request.instanceId,
                    databaseName: request.databaseName
                }
            });

            // TODO: Week 2 - FR4.2: Send Slack DM to requester on rejection
            // - Rejection notification with original query/script details
            // - Include rejection reason if provided
            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_REJECTED,
                request: rejectedRequest,
                approverEmail: user.email,
                rejectionReason: reason
            });

            sendSuccess(res, rejectedRequest, 'Request rejected successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/requests/pending
     * Get pending requests for approval (Manager/Admin view)
     */
    static async getPending(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user!;
            const { page, limit } = getPaginationParams(req.query);

            // Build filters
            const filters: { status: RequestStatus; allowedPodIds?: string[] } = {
                status: RequestStatus.PENDING
            };

            // Managers can only see their PODs
            if (user.role === UserRole.MANAGER) {
                filters.allowedPodIds = user.managedPodIds;
            }

            const { requests, total } = await QueryRequestModel.findWithFilters(
                filters,
                page,
                limit
            );

            // Audit log: pending requests viewed
            logger.audit({
                category: AuditCategory.APPROVAL,
                action: AuditAction.PENDING_REQUESTS_VIEWED,
                message: `Viewed ${total} pending requests`,
                userId: user.userId,
                userEmail: user.email,
                ipAddress: getClientIp(req),
                requestId: req.requestId,
                outcome: 'SUCCESS',
                details: {
                    page,
                    limit,
                    totalPending: total,
                    role: user.role
                }
            });

            sendPaginated(res, requests, page, limit, total);
        } catch (error) {
            next(error);
        }
    }
}
