import { SlackService, sendSlackNotification, SlackNotificationType } from '../../../src/services/slack.service';
import { SubmissionType, DatabaseType, RequestStatus, UserRole } from '../../../src/types';
import { logger } from '../../../src/utils/logger';
import { WebClient } from '@slack/web-api';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock @slack/web-api
jest.mock('@slack/web-api', () => {
    return {
        WebClient: jest.fn().mockImplementation(() => ({
            chat: {
                postMessage: jest.fn().mockResolvedValue({ ok: true })
            },
            users: {
                lookupByEmail: jest.fn().mockResolvedValue({ ok: true, user: { id: 'U12345' } })
            }
        }))
    };
});

describe('SlackService', () => {
    let mockWebClient: any;

    const mockRequest = {
        id: 'req-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        databaseType: DatabaseType.POSTGRESQL,
        instanceId: 'db-1',
        instanceName: 'Production DB',
        databaseName: 'app_db', // Optional
        podName: 'Engineering',
        submissionType: SubmissionType.QUERY,
        query: 'SELECT * FROM users',
        comments: 'Need access',
        status: RequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset env vars
        delete process.env.SLACK_BOT_TOKEN;
        delete process.env.SLACK_APPROVAL_CHANNEL;

        // Reset private static state (hacky but necessary for singleton/static testing if not exposed)
        (SlackService as any).client = null;
        (SlackService as any).approvalChannelId = '';
        (SlackService as any).isEnabled = false;

        // Get the mock instance
        mockWebClient = new WebClient();
        (WebClient as unknown as jest.Mock).mockClear();
    });

    describe('initialize', () => {
        it('should warn and disable if token is missing', async () => {
            SlackService.initialize();

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SLACK_BOT_TOKEN not configured'));
            expect((SlackService as any).isEnabled).toBe(false);
        });

        it('should initialize client if token is present', async () => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-token';
            process.env.SLACK_APPROVAL_CHANNEL = 'C12345';

            SlackService.initialize();

            expect(WebClient).toHaveBeenCalledWith('xoxb-token');
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Slack client initialized'), expect.any(Object));
            expect((SlackService as any).isEnabled).toBe(true);
            expect((SlackService as any).approvalChannelId).toBe('C12345');
        });
    });

    describe('Notification Methods', () => {
        beforeEach(() => {
            // Setup valid environment for notification tests
            process.env.SLACK_BOT_TOKEN = 'xoxb-token';
            process.env.SLACK_APPROVAL_CHANNEL = 'C12345';
            SlackService.initialize();

            // Get the mock instance created during initialize
            mockWebClient = (SlackService as any).client;
        });

        describe('notifyNewRequest', () => {
            it('should send notification to channel with correct blocks', async () => {
                await SlackService.notifyNewRequest(mockRequest as any);

                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    channel: 'C12345',
                    text: expect.stringMatching(/New query request/i),
                    blocks: expect.arrayContaining([
                        expect.objectContaining({ type: 'header' }),
                        expect.objectContaining({ type: 'section' })
                    ])
                }));
                expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('New request notification sent'), expect.any(Object));
            });

            it('should skip if approval channel not configured', async () => {
                (SlackService as any).approvalChannelId = '';
                await SlackService.notifyNewRequest(mockRequest as any);
                expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
                expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('no approval channel configured'));
            });

            it('should handle errors gracefully', async () => {
                mockWebClient.chat.postMessage.mockRejectedValue(new Error('API Error'));
                await SlackService.notifyNewRequest(mockRequest as any);
                expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send new request notification'), expect.any(Object));
            });

            it('should skip if service disabled', async () => {
                (SlackService as any).isEnabled = false;
                await SlackService.notifyNewRequest(mockRequest as any);
                expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
            });

            it('should handle non-Error exceptions', async () => {
                mockWebClient.chat.postMessage.mockRejectedValue('String Error');
                await SlackService.notifyNewRequest(mockRequest as any);
                expect(logger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to send new request notification'),
                    expect.objectContaining({ error: 'Unknown error' })
                );

            });

            it('should handle missing databaseName', async () => {
                const req = { ...mockRequest, databaseName: undefined };
                await SlackService.notifyNewRequest(req as any);
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            fields: expect.arrayContaining([
                                expect.objectContaining({ text: expect.stringContaining('N/A') })
                            ])
                        })
                    ])
                }));
            });

            it('should handle missing comments', async () => {
                const req = { ...mockRequest, comments: undefined };
                await SlackService.notifyNewRequest(req as any);
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.not.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('*Reason/Comments:*') })
                        })
                    ])
                }));
            });

            it('should truncate long query in new request', async () => {
                const longQuery = 'SELECT '.repeat(50); // > 200 chars
                const req = { ...mockRequest, query: longQuery };
                await SlackService.notifyNewRequest(req as any);
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('...') })
                        })
                    ])
                }));
            });

            it('should truncate long script in new request', async () => {
                const longScript = 'console.log("hello");'.repeat(20); // > 200 chars
                const req = { ...mockRequest, submissionType: SubmissionType.SCRIPT, query: undefined, scriptContent: longScript };
                await SlackService.notifyNewRequest(req as any);
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('...') })
                        })
                    ])
                }));
            });
        });

        describe('notifyRequesterApproved', () => {
            it('should send DM to requester', async () => {
                const result = { success: true, rowCount: 10 };
                await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', result);

                expect(mockWebClient.users.lookupByEmail).toHaveBeenCalledWith({ email: 'user@example.com' });
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    channel: 'U12345', // from mock
                    text: expect.stringContaining('approved'),
                    blocks: expect.any(Array)
                }));
            });

            it('should log warning if user not found', async () => {
                mockWebClient.users.lookupByEmail.mockResolvedValue({ ok: false, error: 'users_not_found' });

                await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', { success: true });

                expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not find Slack user'), expect.any(Object));
                expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
            });

            it('should include error details in DM if execution failed', async () => {
                mockWebClient.users.lookupByEmail.mockResolvedValue({ ok: true, user: { id: 'U12345' } });
                const result = { success: false, error: 'Database timeout' };

                await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', result);

                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    text: expect.stringContaining('execution failed'),
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('Database timeout') })
                        })
                    ])
                }));
            });

            it('should skip if service disabled', async () => {
                (SlackService as any).isEnabled = false;
                await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', { success: true });
                expect(mockWebClient.users.lookupByEmail).not.toHaveBeenCalled();
            });

            it('should include short output in DM', async () => {
                const shortOutput = 'Short result';
                await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', { success: true, output: shortOutput });
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({ text: expect.objectContaining({ text: expect.stringContaining('Short result') }) })
                    ])
                }));
                // Verify NO truncation message
                expect(mockWebClient.chat.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({ text: expect.objectContaining({ text: expect.stringContaining('truncated') }) })
                    ])
                }));
            });

            it('should handle errors gracefully', async () => {
                mockWebClient.users.lookupByEmail.mockResolvedValue({ ok: true, user: { id: 'U12345' } });
                mockWebClient.chat.postMessage.mockRejectedValue(new Error('API Error'));
                await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', { success: true });
                expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send approval DM'), expect.any(Object));
            });

            it('should handle non-Error exceptions', async () => {
                mockWebClient.users.lookupByEmail.mockResolvedValue({ ok: true, user: { id: 'U12345' } });
                mockWebClient.chat.postMessage.mockRejectedValue('String Error');
                await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', { success: true });
                expect(logger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to send approval DM'),
                    expect.objectContaining({ error: 'Unknown error' })
                );
            });
        });

        describe('notifyChannelExecutionResult', () => {
            it('should send execution result to channel', async () => {
                await SlackService.notifyChannelExecutionResult(mockRequest as any, 'approver@z.com', { success: true, rowCount: 5 });

                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    channel: 'C12345',
                    text: expect.stringContaining('executed successfully')
                }));
            });

            it('should include error details if execution failed', async () => {
                await SlackService.notifyChannelExecutionResult(mockRequest as any, 'approver@z.com', { success: false, error: 'DB Error' });

                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('DB Error') })
                        })
                    ])
                }));
            });

            it('should include output preview if successful and output exists', async () => {
                await SlackService.notifyChannelExecutionResult(mockRequest as any, 'approver@z.com', { success: true, output: 'Result Data' });

                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('Result Data') })
                        })
                    ])
                }));
            });

            it('should skip if no channel', async () => {
                (SlackService as any).approvalChannelId = '';
                await SlackService.notifyChannelExecutionResult(mockRequest as any, 'approver@z.com', { success: true });
                expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
            });

            it('should skip if service disabled', async () => {
                (SlackService as any).isEnabled = false;
                await SlackService.notifyChannelExecutionResult(mockRequest as any, 'approver@z.com', { success: true });
                expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
            });

            it('should handle errors gracefully', async () => {
                mockWebClient.chat.postMessage.mockRejectedValue(new Error('API Error'));
                await SlackService.notifyChannelExecutionResult(mockRequest as any, 'approver@z.com', { success: true });
                expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to post execution result to channel'), expect.any(Object));
            });

            it('should handle non-Error exceptions', async () => {
                mockWebClient.chat.postMessage.mockRejectedValue('String Error');
                await SlackService.notifyChannelExecutionResult(mockRequest as any, 'approver@z.com', { success: true });
                expect(logger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to post execution result to channel'),
                    expect.objectContaining({ error: 'Unknown error' })
                );
            });
        });

        describe('notifyRequesterRejected', () => {
            it('should send rejection DM', async () => {
                await SlackService.notifyRequesterRejected(mockRequest as any, 'rejector@z.com', 'Bad query');

                expect(mockWebClient.users.lookupByEmail).toHaveBeenCalledWith({ email: 'user@example.com' });
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    channel: 'U12345',
                    text: expect.stringContaining('rejected'),
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('Bad query') })
                        })
                    ])
                }));
            });

            it('should skip if service disabled', async () => {
                (SlackService as any).isEnabled = false;
                await SlackService.notifyRequesterRejected(mockRequest as any, 'rejector@z.com', 'reason');
                expect(mockWebClient.users.lookupByEmail).not.toHaveBeenCalled();
            });

            it('should log warning if user not found', async () => {
                mockWebClient.users.lookupByEmail.mockResolvedValue({ ok: false, error: 'users_not_found' });
                await SlackService.notifyRequesterRejected(mockRequest as any, 'rejector@z.com', 'reason');
                expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not find Slack user'), expect.any(Object));
                expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
            });

            it('should handle errors gracefully', async () => {
                mockWebClient.users.lookupByEmail.mockResolvedValue({ ok: true, user: { id: 'U12345' } });
                mockWebClient.chat.postMessage.mockRejectedValue(new Error('API Error'));
                await SlackService.notifyRequesterRejected(mockRequest as any, 'rejector@z.com', 'reason');
                expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send rejection DM'), expect.any(Object));
            });

            it('should handle non-Error exceptions', async () => {
                mockWebClient.users.lookupByEmail.mockResolvedValue({ ok: true, user: { id: 'U12345' } });
                mockWebClient.chat.postMessage.mockRejectedValue('String Error');
                await SlackService.notifyRequesterRejected(mockRequest as any, 'rejector@z.com', 'reason');
                expect(logger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to send rejection DM'),
                    expect.objectContaining({ error: 'Unknown error' })
                );
            });

            it('should send rejection without reason', async () => {
                await SlackService.notifyRequesterRejected(mockRequest as any, 'rejector@z.com');
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({ text: expect.stringContaining('No reason provided') })
                        })
                    ])
                }));
            });

            it('should truncate long query in rejection', async () => {
                const longQuery = 'SELECT '.repeat(50);
                const req = { ...mockRequest, query: longQuery };
                await SlackService.notifyRequesterRejected(req as any, 'rejector@z.com', 'reason');
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({ text: expect.objectContaining({ text: expect.stringContaining('...') }) })
                    ])
                }));
            });

            it('should truncate long script in rejection', async () => {
                const longScript = 'x'.repeat(250);
                const req = { ...mockRequest, submissionType: SubmissionType.SCRIPT, query: undefined, scriptContent: longScript };
                await SlackService.notifyRequesterRejected(req as any, 'rejector@z.com', 'reason');
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            text: expect.objectContaining({
                                text: expect.stringContaining('x'.repeat(200) + '...')
                            })
                        })
                    ])
                }));
            });

            it('should handle short script in rejection', async () => {
                const shortScript = 'console.log("hi")';
                const req = { ...mockRequest, query: undefined, scriptContent: shortScript };
                await SlackService.notifyRequesterRejected(req as any, 'rejector@z.com', 'reason');
                expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                    blocks: expect.arrayContaining([
                        expect.objectContaining({ text: expect.objectContaining({ text: expect.stringContaining(shortScript) }) })
                    ])
                }));
            });

            it('should handle both query and script missing in rejection', async () => {
                const req = { ...mockRequest, query: undefined, scriptContent: undefined };
                await SlackService.notifyRequesterRejected(req as any, 'rejector@z.com', 'reason');
                expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
            });

            it('should handle both query and script missing in rejection', async () => {
                const req = { ...mockRequest, query: undefined, scriptContent: undefined };
                await SlackService.notifyRequesterRejected(req as any, 'rejector@z.com', 'reason');
                expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
            });
        });
    });

    describe('helper methods (lookupSlackUserId)', () => {
        beforeEach(() => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-token';
            SlackService.initialize();
            mockWebClient = (SlackService as any).client;
        });

        it('should return null on lookup error', async () => {
            mockWebClient.users.lookupByEmail.mockRejectedValue(new Error('Network error'));

            const result = await (SlackService as any).lookupSlackUserId('foo@bar.com');
            expect(result).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('User lookup failed'), expect.any(Object));
        });

        it('should handle non-Error exceptions in lookup', async () => {
            mockWebClient.users.lookupByEmail.mockRejectedValue('String Error');

            const result = await (SlackService as any).lookupSlackUserId('foo@bar.com');
            expect(result).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('User lookup failed'),
                expect.objectContaining({ error: 'Unknown error' })
            );
        });

        it('should return null if client is null', async () => {
            (SlackService as any).client = null;
            const result = await (SlackService as any).lookupSlackUserId('foo@bar.com');
            expect(result).toBeNull();
        });
    });

    describe('block builders', () => {
        beforeEach(() => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-token';
            process.env.SLACK_APPROVAL_CHANNEL = 'C12345';
            SlackService.initialize();
            mockWebClient = (SlackService as any).client;
        });

        // Indirectly tested above, but adding edge cases
        it('should truncate long output in approval result', async () => {
            const longOutput = 'a'.repeat(3000);
            await SlackService.notifyRequesterApproved(mockRequest as any, 'approver@z.com', { success: true, output: longOutput });

            expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                blocks: expect.arrayContaining([
                    expect.objectContaining({
                        text: expect.objectContaining({
                            text: expect.stringContaining('... (truncated)')
                        })
                    })
                ])
            }));
        });

        it('should handle both query and script missing in new request logic', async () => {
            const req = { ...mockRequest, query: undefined, scriptContent: undefined };
            await SlackService.notifyNewRequest(req as any);
            expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
        });

        it('should handle script content in preview if query is missing', async () => {
            const scriptRequest = { ...mockRequest, query: undefined, scriptContent: 'console.log("hi")' };
            await SlackService.notifyNewRequest(scriptRequest as any);

            expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                blocks: expect.arrayContaining([
                    expect.objectContaining({
                        text: expect.objectContaining({
                            text: expect.stringContaining('console.log("hi")')
                        })
                    })
                ])
            }));
        });
    });

    describe('sendSlackNotification wrapper', () => {
        beforeEach(() => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-token';
            SlackService.initialize();

            // Spy on static methods
            jest.spyOn(SlackService, 'notifyNewRequest');
            jest.spyOn(SlackService, 'notifyRequesterApproved');
            jest.spyOn(SlackService, 'notifyChannelExecutionResult');
            jest.spyOn(SlackService, 'notifyRequesterRejected');
        });

        it('should route REQUEST_SUBMITTED', async () => {
            await sendSlackNotification({ type: SlackNotificationType.REQUEST_SUBMITTED, request: mockRequest as any });
            expect(SlackService.notifyNewRequest).toHaveBeenCalled();
        });

        it('should route REQUEST_APPROVED with execution results', async () => {
            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_APPROVED,
                request: mockRequest as any,
                approverEmail: 'a@b.com',
                executionResult: { success: true }
            });
            expect(SlackService.notifyRequesterApproved).toHaveBeenCalled();
            expect(SlackService.notifyChannelExecutionResult).toHaveBeenCalled();
        });

        it('should route EXECUTION_SUCCESS', async () => {
            await sendSlackNotification({
                type: SlackNotificationType.EXECUTION_SUCCESS,
                request: mockRequest as any,
                approverEmail: 'a@b.com',
                executionResult: { success: true }
            });
            expect(SlackService.notifyRequesterApproved).toHaveBeenCalled();
        });

        it('should route REQUEST_REJECTED', async () => {
            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_REJECTED,
                request: mockRequest as any,
                approverEmail: 'a@b.com',
                rejectionReason: 'no'
            });
            expect(SlackService.notifyRequesterRejected).toHaveBeenCalled();
        });

        it('should catch global errors', async () => {
            (SlackService.notifyNewRequest as jest.Mock).mockRejectedValue(new Error('Boom'));
            await sendSlackNotification({ type: SlackNotificationType.REQUEST_SUBMITTED, request: mockRequest as any });
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send notification'), expect.any(Object));
        });

        it('should handle non-Error catch in global wrapper', async () => {
            (SlackService.notifyNewRequest as jest.Mock).mockRejectedValue('String Error');
            await sendSlackNotification({ type: SlackNotificationType.REQUEST_SUBMITTED, request: mockRequest as any });
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to send notification'),
                expect.objectContaining({ error: 'Unknown error' })
            );
        });
    });
});
