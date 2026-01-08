import { SlackService, sendSlackNotification, SlackNotificationType } from '../../../src/services/slack.service';
import { SubmissionType, DatabaseType, RequestStatus } from '../../../src/types';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));


describe('SlackService', () => {
    const mockRequest = {
        id: 'req-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        databaseType: DatabaseType.POSTGRESQL,
        instanceId: 'db-1',
        instanceName: 'Production DB',
        databaseName: 'app_db',
        submissionType: SubmissionType.QUERY,
        query: 'SELECT * FROM users',
        status: RequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should log TODO message', async () => {
            await SlackService.initialize();
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('TODO: Initialize Slack client'));
        });
    });

    describe('sendSlackNotification', () => {
        it('should handle REQUEST_SUBMITTED', async () => {
            // Spy but let it run to cover the method
            const notifySpy = jest.spyOn(SlackService as any, 'notifyNewRequest');

            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_SUBMITTED,
                request: mockRequest as any
            });

            expect(notifySpy).toHaveBeenCalledWith(mockRequest);
        });

        it('should handle REQUEST_APPROVED', async () => {
            const notifyRequesterSpy = jest.spyOn(SlackService as any, 'notifyRequesterApproved');
            const notifyChannelSpy = jest.spyOn(SlackService as any, 'notifyChannelExecutionResult');

            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_APPROVED,
                request: mockRequest as any,
                approverEmail: 'approver@example.com',
                executionResult: { success: true, rowCount: 1 }
            });

            expect(notifyRequesterSpy).toHaveBeenCalled();
            expect(notifyChannelSpy).toHaveBeenCalled();
        });

        it('should handle REQUEST_REJECTED', async () => {
            const notifySpy = jest.spyOn(SlackService as any, 'notifyRequesterRejected');

            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_REJECTED,
                request: mockRequest as any,
                approverEmail: 'approver@example.com',
                rejectionReason: 'Not allowed'
            });

            expect(notifySpy).toHaveBeenCalled();
        });

        it('should log error when notification fails', async () => {
            // Force failure in the called method
            jest.spyOn(SlackService as any, 'notifyNewRequest').mockRejectedValue(new Error('Slack error'));

            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_SUBMITTED,
                request: mockRequest as any
            });

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send notification'), expect.any(Object));
        });
    });

    it('should handle non-Error exceptions', async () => {
        jest.spyOn(SlackService as any, 'notifyNewRequest').mockRejectedValue('String error');

        await sendSlackNotification({
            type: SlackNotificationType.REQUEST_SUBMITTED,
            request: mockRequest as any
        });

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed to send notification'),
            expect.objectContaining({ error: 'Unknown error' })
        );
    });
});
