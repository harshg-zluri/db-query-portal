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
        isCompressed?: boolean;
        originalSize?: number;
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
     * Upload a file to a Slack channel or DM
     */
    private static async uploadResultFile(
        channelId: string,
        request: QueryRequest,
        output: string,
        isCompressed: boolean
    ): Promise<void> {
        if (!this.client) return;

        try {
            // If compressed, we need to decompress for the file
            // For now, we'll indicate it's the raw output
            const filename = `result_${request.id.slice(0, 8)}.json`;
            const content = isCompressed
                ? `[Result is compressed. Download from portal: ${getAppUrl()}/submissions]`
                : output;

            await this.client.files.uploadV2({
                channel_id: channelId,
                filename,
                content,
                title: `Execution Result - Request ${request.id.slice(0, 8)}`,
                initial_comment: `📁 Execution result for request ${request.id.slice(0, 8)} (${request.databaseType} - ${request.instanceName})`
            });

            logger.info('[SLACK] Result file uploaded', {
                requestId: request.id,
                channel: channelId,
                filename
            });
        } catch (error) {
            logger.error('[SLACK] Failed to upload result file', {
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
        executionResult: { success: boolean; rowCount?: number; output?: string; data?: unknown; error?: string; isCompressed?: boolean; originalSize?: number }
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

            // Upload result file if output is large (and not compressed - compressed stays in DB)
            if (executionResult.success && executionResult.output && executionResult.output.length > 2500 && !executionResult.isCompressed) {
                await this.uploadResultFile(
                    recipientSlackId,
                    request,
                    executionResult.output,
                    false
                );
            }

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
        executionResult: { success: boolean; rowCount?: number; output?: string; error?: string; isCompressed?: boolean; originalSize?: number }
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

            // Upload result file to channel if output is large (and not compressed)
            if (executionResult.success && executionResult.output && executionResult.output.length > 2500 && !executionResult.isCompressed) {
                await this.uploadResultFile(
                    this.approvalChannelId,
                    request,
                    executionResult.output,
                    false
                );
            }

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
    // Block Builder Methods
    // ==========================================================================

    /**
     * Build Block Kit blocks for new request notification
     */
    private static buildNewRequestBlocks(request: QueryRequest): KnownBlock[] {
        const queryPreview = request.query
            ? request.query.substring(0, 200) + (request.query.length > 200 ? '...' : '')
            : request.scriptContent?.substring(0, 200) + (request.scriptContent && request.scriptContent.length > 200 ? '...' : '');

        return [
            {
                type: 'header' as const,
                text: {
                    type: 'plain_text' as const,
                    text: `🆕 New ${request.submissionType.toUpperCase()} Request`,
                    emoji: true
                }
            },
            {
                type: 'section' as const,
                fields: [
                    {
                        type: 'mrkdwn' as const,
                        text: `*Database Type:*\n${request.databaseType}`
                    },
                    {
                        type: 'mrkdwn' as const,
                        text: `*Instance:*\n${request.instanceName}`
                    },
                    {
                        type: 'mrkdwn' as const,
                        text: `*Database:*\n${request.databaseName || 'N/A'}`
                    },
                    {
                        type: 'mrkdwn' as const,
                        text: `*POD:*\n${request.podName}`
                    }
                ]
            },
            {
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Requester:*\n${request.userEmail}`
                }
            },
            ...(request.comments ? [{
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Reason/Comments:*\n${request.comments}`
                }
            }] : []),
            {
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Query Preview:*\n\`\`\`${queryPreview}\`\`\``
                }
            },
            {
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `<${getAppUrl()}/approvals|View in App to Approve/Reject>`
                }
            },
            {
                type: 'context' as const,
                elements: [
                    {
                        type: 'mrkdwn' as const,
                        text: `Request ID: \`${request.id.slice(0, 8)}\` | Submitted: ${new Date(request.createdAt).toLocaleString()}`
                    }
                ]
            },
            {
                type: 'divider' as const
            }
        ];
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

        const blocks: KnownBlock[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${statusEmoji} Request ${statusText}`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Approved by:*\n${approverEmail}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Database:*\n${request.instanceName}`
                    }
                ]
            }
        ];

        if (executionResult.success && executionResult.rowCount !== undefined) {
            blocks.push({
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Rows affected:* ${executionResult.rowCount}`
                }
            });
        }

        if (executionResult.success && executionResult.output) {
            // Check if result is compressed - show download link instead
            if ((executionResult as { isCompressed?: boolean }).isCompressed) {
                const originalSize = (executionResult as { originalSize?: number }).originalSize;
                const sizeInfo = originalSize ? ` (${Math.round(originalSize / 1024)} KB)` : '';
                blocks.push({
                    type: 'section' as const,
                    text: {
                        type: 'mrkdwn' as const,
                        text: `*Execution Result:* Result too large to display${sizeInfo}. Download from the portal.`
                    }
                });
                blocks.push({
                    type: 'section' as const,
                    text: {
                        type: 'mrkdwn' as const,
                        text: `<${getAppUrl()}/submissions|📥 View and Download Result>`
                    }
                });
            } else {
                // Truncate output if too long for Slack block (3000 chars limit)
                const outputPreview = executionResult.output.length > 2500
                    ? executionResult.output.substring(0, 2500) + '... (truncated)'
                    : executionResult.output;

                blocks.push({
                    type: 'section' as const,
                    text: {
                        type: 'mrkdwn' as const,
                        text: `*Execution Result:*\n\`\`\`${outputPreview}\`\`\``
                    }
                });
            }
        }

        if (!executionResult.success && executionResult.error) {
            blocks.push({
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Error:*\n\`\`\`${executionResult.error.substring(0, 500)}\`\`\``
                }
            });
            // Add retry link for failed executions
            blocks.push({
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `<${getAppUrl()}/submissions|View in App to Retry>`
                }
            });
        }

        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Request ID: \`${request.id.slice(0, 8)}\``
                }
            ]
        });

        return blocks;
    }

    /**
     * Build Block Kit blocks for channel execution result
     */
    private static buildChannelExecutionResultBlocks(
        request: QueryRequest,
        approverEmail: string,
        executionResult: { success: boolean; rowCount?: number; output?: string; error?: string; isCompressed?: boolean; originalSize?: number }
    ): KnownBlock[] {
        const statusEmoji = executionResult.success ? '✅' : '❌';
        const statusText = executionResult.success ? 'Executed Successfully' : 'Execution Failed';

        const blocks: KnownBlock[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `${statusEmoji} *Request ${request.id.slice(0, 8)} ${statusText}*`
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Requester:* ${request.userEmail}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Approved by:* ${approverEmail}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Rows:* ${executionResult.rowCount ?? 'N/A'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Database:* ${request.instanceName}`
                    }
                ]
            }
        ];

        if (executionResult.error) {
            blocks.push({
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Error:* ${executionResult.error.substring(0, 500)}`
                }
            });
        }

        if (executionResult.success && executionResult.output) {
            // Handle compressed or large results
            if (executionResult.isCompressed) {
                const originalSize = executionResult.originalSize;
                const sizeInfo = originalSize ? ` (${Math.round(originalSize / 1024)} KB)` : '';
                blocks.push({
                    type: 'section' as const,
                    text: {
                        type: 'mrkdwn' as const,
                        text: `*Execution Result:* Result too large to display${sizeInfo}. <${getAppUrl()}/submissions|📥 Download from Portal>`
                    }
                });
            } else if (executionResult.output.length > 2500) {
                // Large but not compressed - will be uploaded as file
                blocks.push({
                    type: 'section' as const,
                    text: {
                        type: 'mrkdwn' as const,
                        text: `*Execution Result:* See attached JSON file below ⬇️`
                    }
                });
            } else {
                // Small enough to display inline
                blocks.push({
                    type: 'section' as const,
                    text: {
                        type: 'mrkdwn' as const,
                        text: `*Execution Result:*\n\`\`\`${executionResult.output}\`\`\``
                    }
                });
            }
        }

        blocks.push({
            type: 'divider' as const
        });

        return blocks;
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
            ? request.query.substring(0, 200) + (request.query.length > 200 ? '...' : '')
            : request.scriptContent?.substring(0, 200) + (request.scriptContent && request.scriptContent.length > 200 ? '...' : '');

        return [
            {
                type: 'header' as const,
                text: {
                    type: 'plain_text' as const,
                    text: '❌ Request Rejected',
                    emoji: true
                }
            },
            {
                type: 'section' as const,
                fields: [
                    {
                        type: 'mrkdwn' as const,
                        text: `*Rejected by:*\n${rejectorEmail}`
                    },
                    {
                        type: 'mrkdwn' as const,
                        text: `*Database:*\n${request.instanceName}`
                    }
                ]
            },
            {
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Original Request:*\n\`\`\`${queryPreview}\`\`\``
                }
            },
            {
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Rejection Reason:*\n${reason || 'No reason provided'}`
                }
            },
            {
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `<${getAppUrl()}/submissions|View in App to Modify and Resubmit>`
                }
            },
            {
                type: 'context' as const,
                elements: [
                    {
                        type: 'mrkdwn' as const,
                        text: `Request ID: \`${request.id.slice(0, 8)}\``
                    }
                ]
            }
        ];
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
