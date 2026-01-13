/**
 * Slack Notification Service
 * 
 * This service handles all Slack notifications for the DB Query Portal.
 * 
 * Requirements:
 * - FR2.4: Send notification to approval channel on request submission
 * - FR4.1: Send DM to requester + channel message on approval (with results/errors)
 * - FR4.2: Send DM to requester on rejection (with reason)
 */

import { WebClient, KnownBlock } from '@slack/web-api';
import { logger } from '../utils/logger';
import { QueryRequest } from '../types';
import { SlackMessageBuilder } from '../utils/slack-message-builder';

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
 * Get application URL for request links
 */
function getAppUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
}

/**
 * Slack Service Class
 * Handles all Slack API interactions for notifications
 */
export class SlackService {
    private static client: WebClient | null = null;
    private static approvalChannelId: string = '';
    private static isEnabled: boolean = false;

    /**
     * Initialize Slack client
     */
    static initialize(): void {
        const botToken = process.env.SLACK_BOT_TOKEN;
        const channelId = process.env.SLACK_APPROVAL_CHANNEL;

        if (!botToken) {
            logger.warn('[SLACK] SLACK_BOT_TOKEN not configured - Slack notifications disabled');
            this.isEnabled = false;
            return;
        }

        this.client = new WebClient(botToken);
        this.approvalChannelId = channelId || '';
        this.isEnabled = true;

        logger.info('[SLACK] Slack client initialized', {
            hasApprovalChannel: !!channelId
        });
    }

    /**
     * Check if Slack is enabled
     */
    private static ensureEnabled(): boolean {
        if (!this.isEnabled || !this.client) {
            logger.debug('[SLACK] Slack notifications disabled - skipping');
            return false;
        }
        return true;
    }

    /**
     * FR2.4: Send notification to approval channel when a new request is submitted
     */
    static async notifyNewRequest(request: QueryRequest): Promise<void> {
        if (!this.ensureEnabled() || !this.approvalChannelId) {
            logger.debug('[SLACK] Skipping new request notification - no approval channel configured');
            return;
        }

        try {
            const blocks = this.buildNewRequestBlocks(request);
            await this.client!.chat.postMessage({
                channel: this.approvalChannelId,
                text: `New ${request.submissionType} request from ${request.userEmail}`,
                blocks
            });

            logger.info('[SLACK] New request notification sent', {
                requestId: request.id,
                requester: request.userEmail,
                channel: this.approvalChannelId
            });
        } catch (error) {
            logger.error('[SLACK] Failed to send new request notification', {
                requestId: request.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * FR4.1: Send DM to requester with execution results
     */
    static async notifyRequesterApproved(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; output?: string; data?: unknown; error?: string }
    ): Promise<void> {
        if (!this.ensureEnabled()) return;

        try {
            const recipientSlackId = await this.lookupSlackUserId(request.userEmail);
            if (!recipientSlackId) {
                logger.warn('[SLACK] Could not find Slack user for DM', { email: request.userEmail });
                return;
            }

            const blocks = this.buildApprovalResultBlocks(request, approverEmail, executionResult);
            await this.client!.chat.postMessage({
                channel: recipientSlackId,
                text: executionResult.success
                    ? `Your request was approved and executed successfully!`
                    : `Your request was approved but execution failed.`,
                blocks
            });

            logger.info('[SLACK] Approval DM sent to requester', {
                requestId: request.id,
                requester: request.userEmail,
                approver: approverEmail,
                success: executionResult.success
            });
        } catch (error) {
            logger.error('[SLACK] Failed to send approval DM', {
                requestId: request.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * FR4.1: Send execution results to approval channel
     */
    static async notifyChannelExecutionResult(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; output?: string; error?: string }
    ): Promise<void> {
        if (!this.ensureEnabled() || !this.approvalChannelId) return;

        try {
            const blocks = this.buildChannelExecutionResultBlocks(request, approverEmail, executionResult);
            await this.client!.chat.postMessage({
                channel: this.approvalChannelId,
                text: executionResult.success
                    ? `Request ${request.id.slice(0, 8)} executed successfully`
                    : `Request ${request.id.slice(0, 8)} execution failed`,
                blocks
            });

            logger.info('[SLACK] Execution result posted to channel', {
                requestId: request.id,
                channel: this.approvalChannelId,
                success: executionResult.success
            });
        } catch (error) {
            logger.error('[SLACK] Failed to post execution result to channel', {
                requestId: request.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * FR4.2: Send DM to requester on rejection
     */
    static async notifyRequesterRejected(
        request: QueryRequest,
        rejectorEmail: string,
        reason?: string
    ): Promise<void> {
        if (!this.ensureEnabled()) return;

        try {
            const recipientSlackId = await this.lookupSlackUserId(request.userEmail);
            if (!recipientSlackId) {
                logger.warn('[SLACK] Could not find Slack user for rejection DM', { email: request.userEmail });
                return;
            }

            const blocks = this.buildRejectionBlocks(request, rejectorEmail, reason);
            await this.client!.chat.postMessage({
                channel: recipientSlackId,
                text: `Your request was rejected`,
                blocks
            });

            logger.info('[SLACK] Rejection DM sent to requester', {
                requestId: request.id,
                requester: request.userEmail,
                rejector: rejectorEmail,
                hasReason: !!reason
            });
        } catch (error) {
            logger.error('[SLACK] Failed to send rejection DM', {
                requestId: request.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Lookup Slack user ID by email
     */
    private static async lookupSlackUserId(email: string): Promise<string | null> {
        if (!this.client) return null;

        try {
            const result = await this.client.users.lookupByEmail({ email });
            return result.user?.id || null;
        } catch (error) {
            logger.debug('[SLACK] User lookup failed', {
                email,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }

    // ==========================================================================
    // Block Builder Methods (Refactored to use SlackMessageBuilder)
    // ==========================================================================

    /**
     * Build Block Kit blocks for new request notification
     */
    private static buildNewRequestBlocks(request: QueryRequest): KnownBlock[] {
        const queryPreview = request.query
            ? request.query
            : request.scriptContent || '';

        const builder = new SlackMessageBuilder()
            .header(`🆕 New ${request.submissionType.toUpperCase()} Request`)
            .sectionFields([
                { label: 'Database Type', value: request.databaseType },
                { label: 'Instance', value: request.instanceName },
                { label: 'Database', value: request.databaseName || 'N/A' },
                { label: 'POD', value: request.podName }
            ])
            .section(`*Requester:*\n${request.userEmail}`);

        if (request.comments) {
            builder.section(`*Reason/Comments:*\n${request.comments}`);
        }

        builder.section('*Query Preview:*')
            .codeBlock(queryPreview, 200)
            .linkValidation('View in App to Approve/Reject', `${getAppUrl()}/approvals`)
            .context(`Request ID: \`${request.id.slice(0, 8)}\` | Submitted: ${new Date(request.createdAt).toLocaleString()}`)
            .divider();

        return builder.build();
    }

    /**
     * Build Block Kit blocks for approval result DM
     */
    private static buildApprovalResultBlocks(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; output?: string; error?: string }
    ): KnownBlock[] {
        const statusEmoji = executionResult.success ? '✅' : '❌';
        const statusText = executionResult.success ? 'Executed Successfully' : 'Execution Failed';

        const builder = new SlackMessageBuilder()
            .header(`${statusEmoji} Request ${statusText}`)
            .sectionFields([
                { label: 'Approved by', value: approverEmail },
                { label: 'Database', value: request.instanceName }
            ]);

        if (executionResult.success && executionResult.rowCount !== undefined) {
            builder.section(`*Rows affected:* ${executionResult.rowCount}`);
        }

        if (executionResult.success && executionResult.output) {
            builder.section('*Execution Result:*')
                .codeBlock(executionResult.output);
        }

        if (!executionResult.success && executionResult.error) {
            builder.section('*Error:*')
                .codeBlock(executionResult.error, 500)
                .linkValidation('View in App to Retry', `${getAppUrl()}/submissions`);
        }

        builder.context(`Request ID: \`${request.id.slice(0, 8)}\``);

        return builder.build();
    }

    /**
     * Build Block Kit blocks for channel execution result
     */
    private static buildChannelExecutionResultBlocks(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; output?: string; error?: string }
    ): KnownBlock[] {
        const statusEmoji = executionResult.success ? '✅' : '❌';
        const statusText = executionResult.success ? 'Executed Successfully' : 'Execution Failed';

        const builder = new SlackMessageBuilder()
            .section(`${statusEmoji} *Request ${request.id.slice(0, 8)} ${statusText}*`)
            .sectionFields([
                { label: 'Requester', value: request.userEmail },
                { label: 'Approved by', value: approverEmail },
                { label: 'Rows', value: executionResult.rowCount?.toString() ?? 'N/A' },
                { label: 'Database', value: request.instanceName }
            ]);

        if (executionResult.error) {
            builder.section(`*Error:* ${executionResult.error.substring(0, 500)}`);
        }

        if (executionResult.success && executionResult.output) {
            builder.section('*Execution Result:*')
                .codeBlock(executionResult.output);
        }

        builder.divider();

        return builder.build();
    }

    /**
     * Build Block Kit blocks for rejection DM
     */
    private static buildRejectionBlocks(
        request: QueryRequest,
        rejectorEmail: string,
        reason?: string
    ): KnownBlock[] {
        const queryPreview = request.query
            ? request.query
            : request.scriptContent || '';

        const builder = new SlackMessageBuilder()
            .header('❌ Request Rejected')
            .sectionFields([
                { label: 'Rejected by', value: rejectorEmail },
                { label: 'Database', value: request.instanceName }
            ])
            .section('*Original Request:*')
            .codeBlock(queryPreview, 200)
            .section(`*Rejection Reason:*\n${reason || 'No reason provided'}`)
            .linkValidation('View in App to Modify and Resubmit', `${getAppUrl()}/submissions`)
            .context(`Request ID: \`${request.id.slice(0, 8)}\``);

        return builder.build();
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
