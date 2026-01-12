import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubmissionDetailModal } from './index';
import { DatabaseType, RequestStatus, SubmissionType } from '@/types';

// Mock child components to verify props easier
vi.mock('@components/code-viewer', () => ({
    CodeViewer: ({ code }: { code: string }) => <div data-testid="code-viewer">{code}</div>
}));

const mockRequest = {
    id: 'req-1',
    userId: 'u1',
    userEmail: 'user@example.com',
    databaseType: DatabaseType.POSTGRESQL,
    instanceId: 'inst1',
    instanceName: 'Prod DB',
    databaseName: 'db1',
    submissionType: SubmissionType.QUERY,
    query: 'SELECT * FROM users',
    comments: 'Just checking',
    podId: 'pod1',
    podName: 'Alpha',
    status: RequestStatus.PENDING,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '',
    warnings: [],
};

describe('SubmissionDetailModal', () => {
    const defaultProps = {
        request: mockRequest as any,
        isOpen: true,
        onClose: vi.fn(),
        onWithdraw: vi.fn(),
        isWithdrawing: false,
    };

    it('renders nothing if request is null', () => {
        const { container } = render(<SubmissionDetailModal {...defaultProps} request={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders details correctly', () => {
        render(<SubmissionDetailModal {...defaultProps} />);

        expect(screen.getByText('Request Details')).toBeInTheDocument();
        expect(screen.getByText('Prod DB')).toBeInTheDocument();
        expect(screen.getByTestId('code-viewer')).toHaveTextContent('SELECT * FROM users');
    });

    it('renders warnings', () => {
        const warningRequest = { ...mockRequest, warnings: ['Dangerous query'] };
        render(<SubmissionDetailModal {...defaultProps} request={warningRequest as any} />);
        expect(screen.getByText('Security Warnings')).toBeInTheDocument();
        expect(screen.getByText('Dangerous query')).toBeInTheDocument();
    });

    it('shows execution result', () => {
        const executedRequest = {
            ...mockRequest,
            status: RequestStatus.EXECUTED,
            executionResult: '{"count": 1}'
        };
        render(<SubmissionDetailModal {...defaultProps} request={executedRequest as any} />);
        expect(screen.getByText('Execution Result')).toBeInTheDocument();
        const codeViewers = screen.getAllByTestId('code-viewer');
        expect(codeViewers[1]).toHaveTextContent('{"count": 1}');
    });

    it('shows rejection reason', () => {
        const rejectedRequest = {
            ...mockRequest,
            status: RequestStatus.REJECTED,
            rejectionReason: 'Bad query'
        };
        render(<SubmissionDetailModal {...defaultProps} request={rejectedRequest as any} />);
        expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
        expect(screen.getByText('Bad query')).toBeInTheDocument();
    });

    it('allows withdrawal for pending requests', () => {
        render(<SubmissionDetailModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Withdraw Request' }));
        expect(defaultProps.onWithdraw).toHaveBeenCalledWith('req-1');
    });

    it('hides withdraw button for non-pending requests', () => {
        const approvedRequest = { ...mockRequest, status: RequestStatus.APPROVED };
        render(<SubmissionDetailModal {...defaultProps} request={approvedRequest as any} />);
        expect(screen.queryByRole('button', { name: 'Withdraw Request' })).not.toBeInTheDocument();
    });
});
