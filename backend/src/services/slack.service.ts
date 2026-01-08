/**
 * Slack Notification Service
 * 
 * TODO: Week 2 Implementation
 * This service handles all Slack notifications for the DB Query Portal.
 * 
 * Requirements:
 * - FR2.4: Send notification to approval channel on request submission
 * - FR4.1: Send DM to requester + channel message on approval (with results/errors)
 * - FR4.2: Send DM to requester on rejection (with reason)
 */

import { logger } from '../utils/logger';
import { QueryRequest } from '../types';

// TODO: Add Slack SDK import when implementing
// import { WebClient } from '@slack/web-api';

/**
 * Slack notification types for type safety
 */
export enum SlackNotificationType {
    REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
    REQUEST_APPROVED = 'REQUEST_APPROVED',
    REQUEST_REJECTED = 'REQUEST_REJECTED',
    EXECUTION_SUCCESS = 'EXECUTION_SUCCESS',
    EXECUTION_FAILED = 'EXECUTION_FAILED'
}

/**
 * Slack notification payload interface
 */
export interface SlackNotificationPayload {
    type: SlackNotificationType;
    request: QueryRequest;
    recipientEmail?: string;
    approverEmail?: string;
    rejectionReason?: string;
    executionResult?: {
        success: boolean;
        rowCount?: number;
        output?: string;
        error?: string;
    };
}

/**
 * Slack Service Class
 * 
 * TODO: Week 2 - Implement the following:
 * 1. Initialize Slack WebClient with bot token (SLACK_BOT_TOKEN env var)
 * 2. Store approval channel ID (SLACK_APPROVAL_CHANNEL env var)
 * 3. Implement user email to Slack user ID lookup
 * 4. Create rich block-kit formatted messages
 */
export class SlackService {
    // TODO: private static client: WebClient;
    // TODO: private static approvalChannelId: string;

    /**
     * Initialize Slack client
     * TODO: Week 2 - Implement initialization
     */
    static async initialize(): Promise<void> {
        // TODO: Week 2 Implementation
        // this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
        // this.approvalChannelId = process.env.SLACK_APPROVAL_CHANNEL || '';
        logger.info('[SLACK] TODO: Initialize Slack client with bot token');
    }

    /**
     * FR2.4: Send notification to approval channel when a new request is submitted
     * 
     * Message should include:
     * - Requester info
     * - Request type (query/script)
     * - Database info (type, instance, database name)
     * - POD name
     * - Quick preview of query/script
     * - Approve/Reject action buttons (if using interactive messages)
     */
    static async notifyNewRequest(request: QueryRequest): Promise<void> {
        // TODO: Week 2 Implementation
        logger.info('[SLACK] TODO: Send new request notification to approval channel', {
            requestId: request.id,
            requester: request.userEmail,
            podName: request.podName,
            databaseType: request.databaseType,
            submissionType: request.submissionType
        });

        // TODO: Implementation outline:
        // const blocks = this.buildNewRequestBlocks(request);
        // await this.client.chat.postMessage({
        //     channel: this.approvalChannelId,
        //     text: `New ${request.submissionType} request from ${request.userEmail}`,
        //     blocks
        // });
    }

    /**
     * FR4.1: Send DM to requester with execution results
     * 
     * Message should include:
     * - Approval confirmation
     * - Approver info
     * - Execution status (success/failure)
     * - Results summary or error details
     * - Link to view full results (if applicable)
     */
    static async notifyRequesterApproved(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; data?: unknown; error?: string }
    ): Promise<void> {
        // TODO: Week 2 Implementation
        logger.info('[SLACK] TODO: Send approval DM to requester', {
            requestId: request.id,
            requester: request.userEmail,
            approver: approverEmail,
            executionSuccess: executionResult.success,
            rowCount: executionResult.rowCount
        });

        // TODO: Implementation outline:
        // const recipientSlackId = await this.lookupSlackUserId(request.userEmail);
        // const blocks = this.buildApprovalResultBlocks(request, approverEmail, executionResult);
        // await this.client.chat.postMessage({
        //     channel: recipientSlackId,
        //     text: executionResult.success 
        //         ? `Your request was approved and executed successfully!`
        //         : `Your request was approved but execution failed.`,
        //     blocks
        // });
    }

    /**
     * FR4.1: Send execution results to approval channel
     * 
     * Message should include:
     * - Original request reference
     * - Approver info
     * - Execution status
     * - Results summary or error details
     */
    static async notifyChannelExecutionResult(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; error?: string }
    ): Promise<void> {
        // TODO: Week 2 Implementation
        logger.info('[SLACK] TODO: Send execution result to approval channel', {
            requestId: request.id,
            approver: approverEmail,
            executionSuccess: executionResult.success,
            rowCount: executionResult.rowCount,
            error: executionResult.error
        });

        // TODO: Implementation outline:
        // const blocks = this.buildChannelExecutionResultBlocks(request, approverEmail, executionResult);
        // await this.client.chat.postMessage({
        //     channel: this.approvalChannelId,
        //     text: executionResult.success
        //         ? `Request ${request.id} executed successfully`
        //         : `Request ${request.id} execution failed`,
        //     blocks
        // });
    }

    /**
     * FR4.2: Send DM to requester on rejection
     * 
     * Message should include:
     * - Rejection notification
     * - Rejector info
     * - Original query/script details
     * - Rejection reason (if provided)
     */
    static async notifyRequesterRejected(
        request: QueryRequest,
        rejectorEmail: string,
        reason?: string
    ): Promise<void> {
        // TODO: Week 2 Implementation
        logger.info('[SLACK] TODO: Send rejection DM to requester', {
            requestId: request.id,
            requester: request.userEmail,
            rejector: rejectorEmail,
            reason: reason || 'No reason provided'
        });

        // TODO: Implementation outline:
        // const recipientSlackId = await this.lookupSlackUserId(request.userEmail);
        // const blocks = this.buildRejectionBlocks(request, rejectorEmail, reason);
        // await this.client.chat.postMessage({
        //     channel: recipientSlackId,
        //     text: `Your request was rejected`,
        //     blocks
        // });
    }

    /**
     * Lookup Slack user ID by email
     * TODO: Week 2 - Implement email to Slack ID lookup
     */
    /* istanbul ignore next */
    private static async lookupSlackUserId(email: string): Promise<string | null> {
        // TODO: Week 2 Implementation
        logger.debug('[SLACK] TODO: Lookup Slack user ID for email', { email });

        // TODO: Implementation outline:
        // const result = await this.client.users.lookupByEmail({ email });
        // return result.user?.id || null;
        return null;
    }

    // ==========================================================================
    // Block Builder Methods - TODO: Week 2
    // ==========================================================================

    /**
     * Build Block Kit blocks for new request notification
     */
    /* istanbul ignore next */
    private static buildNewRequestBlocks(request: QueryRequest): unknown[] {
        // TODO: Week 2 - Return Slack Block Kit formatted blocks
        // See: https://api.slack.com/block-kit
        return [];
    }

    /**
     * Build Block Kit blocks for approval result DM
     */
    /* istanbul ignore next */
    private static buildApprovalResultBlocks(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; data?: unknown; error?: string }
    ): unknown[] {
        // TODO: Week 2 - Return Slack Block Kit formatted blocks
        return [];
    }

    /**
     * Build Block Kit blocks for channel execution result
     */
    /* istanbul ignore next */
    private static buildChannelExecutionResultBlocks(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; error?: string }
    ): unknown[] {
        // TODO: Week 2 - Return Slack Block Kit formatted blocks
        return [];
    }

    /**
     * Build Block Kit blocks for rejection DM
     */
    /* istanbul ignore next */
    private static buildRejectionBlocks(
        request: QueryRequest,
        rejectorEmail: string,
        reason?: string
    ): unknown[] {
        // TODO: Week 2 - Return Slack Block Kit formatted blocks
        return [];
    }
}

/**
 * Convenience function to send Slack notification
 * Wraps all notification logic and handles errors gracefully
 */
export async function sendSlackNotification(payload: SlackNotificationPayload): Promise<void> {
    try {
        switch (payload.type) {
            case SlackNotificationType.REQUEST_SUBMITTED:
                await SlackService.notifyNewRequest(payload.request);
                break;

            case SlackNotificationType.REQUEST_APPROVED:
            case SlackNotificationType.EXECUTION_SUCCESS:
            case SlackNotificationType.EXECUTION_FAILED:
                if (payload.approverEmail && payload.executionResult) {
                    await SlackService.notifyRequesterApproved(
                        payload.request,
                        payload.approverEmail,
                        payload.executionResult
                    );
                    await SlackService.notifyChannelExecutionResult(
                        payload.request,
                        payload.approverEmail,
                        payload.executionResult
                    );
                }
                break;

            case SlackNotificationType.REQUEST_REJECTED:
                if (payload.approverEmail) {
                    await SlackService.notifyRequesterRejected(
                        payload.request,
                        payload.approverEmail,
                        payload.rejectionReason
                    );
                }
                break;
        }
    } catch (error) {
        // Log error but don't throw - Slack failures shouldn't break the main flow
        logger.error('[SLACK] Failed to send notification', {
            type: payload.type,
            requestId: payload.request.id,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
