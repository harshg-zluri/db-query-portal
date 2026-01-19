import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ApprovalTable } from './index';
import { DatabaseType, RequestStatus, SubmissionType } from '@/types';

// Mock CodeViewer to expose its content for testing
vi.mock('@components/code-viewer', () => ({
    CodeViewer: ({ code }: { code: string }) => <div data-testid="code-viewer">{code}</div>
}));

// Partial mock for brevity
const mockRequest = {
    id: 'req-12345678',
    userId: 'u1',
    userEmail: 'user@example.com',
    databaseType: DatabaseType.POSTGRESQL,
    instanceId: 'inst1',
    instanceName: 'Prod DB',
    databaseName: 'users_db',
    submissionType: SubmissionType.QUERY,
    query: 'SELECT * FROM users',
    comments: 'Need access',
    podId: 'pod1',
    podName: 'Alpha',
    status: RequestStatus.PENDING,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    warnings: [],
};

describe('ApprovalTable', () => {
    const defaultProps = {
        requests: [mockRequest] as any[],
        isLoading: false,
        onApprove: vi.fn(),
        onReject: vi.fn(),
        approvingId: null,
        rejectingId: null,
    };

    it('renders loading state', () => {
        render(<ApprovalTable {...defaultProps} isLoading={true} />);
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        // Assuming SkeletonTable renders placeholders, verifying real content is absent
        expect(screen.queryByText('Prod DB')).not.toBeInTheDocument();
    });

    it('renders empty state', () => {
        render(<ApprovalTable {...defaultProps} requests={[]} />);
        // NoPendingRequestsEmpty component text check (assuming it says something like "No pending")
        // Since I don't see the exact text of NoPendingRequestsEmpty, checking for a key phrase or the container
        // We can just check that it doesn't render a table
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders table rows correctly', () => {
        render(<ApprovalTable {...defaultProps} />);
        expect(screen.getByText('Prod DB')).toBeInTheDocument();
        expect(screen.getByText('users_db')).toBeInTheDocument();
        expect(screen.getByText('req-1234')).toBeInTheDocument(); // truncated ID
        expect(screen.getByText('SELECT * FROM users')).toBeInTheDocument();
    });

    it('expands row to show details', () => {
        render(<ApprovalTable {...defaultProps} />);

        // Find row by some content and click it
        const row = screen.getByText('Prod DB').closest('tr');
        if (!row) throw new Error('Row not found');

        fireEvent.click(row);

        // Expanded content should appear
        expect(screen.getByText('Full Comments')).toBeInTheDocument();
        // Check for CodeViewer content (now has query in it)
        expect(screen.getByTestId('code-viewer')).toHaveTextContent('SELECT * FROM users');
    });

    it('shows warnings if present', () => {
        const warningRequest = { ...mockRequest, warnings: ['Bad Query'] };
        render(<ApprovalTable {...defaultProps} requests={[warningRequest] as any[]} />);

        expect(screen.getByTitle('Has security warnings')).toBeInTheDocument();

        // Expand
        const row = screen.getByText('Prod DB').closest('tr');
        if (!row) throw new Error('Row not found');
        fireEvent.click(row);

        expect(screen.getByText('Bad Query')).toBeInTheDocument();
    });

    it('renders script request details correctly', () => {
        const scriptRequest = {
            ...mockRequest,
            submissionType: SubmissionType.SCRIPT,
            scriptFileName: 'update_users.js',
            scriptContent: 'db.users.updateMany({})',
        };
        render(<ApprovalTable {...defaultProps} requests={[scriptRequest] as any[]} />);

        expect(screen.getByText('update_users.js')).toBeInTheDocument();

        // Expand
        const row = screen.getByText('Prod DB').closest('tr');
        if (!row) throw new Error('Row not found');
        fireEvent.click(row);

        expect(screen.getByText(/Script: update_users.js/)).toBeInTheDocument();
    });

    it('does not expand row when clicking action buttons', () => {
        render(<ApprovalTable {...defaultProps} />);

        // Click the Approve button
        const approveButton = screen.getByRole('button', { name: 'Approve' });
        fireEvent.click(approveButton);

        // Row should NOT be expanded (stopPropagation)
        expect(screen.queryByText('Full Comments')).not.toBeInTheDocument();
        expect(defaultProps.onApprove).toHaveBeenCalledWith('req-12345678');
    });

    it('collapses expanded row on second click', () => {
        render(<ApprovalTable {...defaultProps} />);

        const row = screen.getByText('Prod DB').closest('tr');
        if (!row) throw new Error('Row not found');

        // Expand
        fireEvent.click(row);
        expect(screen.getByText('Full Comments')).toBeInTheDocument();

        // Collapse
        fireEvent.click(row);
        expect(screen.queryByText('Full Comments')).not.toBeInTheDocument();
    });

    it('shows fallback for script without filename', () => {
        const scriptRequest = {
            ...mockRequest,
            submissionType: SubmissionType.SCRIPT,
            scriptFileName: undefined,
            scriptContent: 'console.log("test")',
        };
        render(<ApprovalTable {...defaultProps} requests={[scriptRequest] as any[]} />);
        expect(screen.getByText('Script file')).toBeInTheDocument();
    });

    it('truncates long queries in preview', () => {
        const longQueryRequest = {
            ...mockRequest,
            query: 'SELECT * FROM users WHERE id = 1 AND status = active AND name LIKE pattern AND email IS NOT NULL',
        };
        const { container } = render(<ApprovalTable {...defaultProps} requests={[longQueryRequest] as any[]} />);
        // Check the preview truncation by looking at container content - 50 char truncation
        expect(container.textContent).toContain('SELECT * FROM users WHERE id = 1 AND status = acti...');
    });

    it('handles MongoDB request type', () => {
        const mongoRequest = {
            ...mockRequest,
            databaseType: DatabaseType.MONGODB,
            query: 'db.users.find({})',
        };
        render(<ApprovalTable {...defaultProps} requests={[mongoRequest] as any[]} />);
        expect(screen.getByText('db.users.find({})')).toBeInTheDocument();
    });

    it('shows fallback when script content is missing in expanded view', () => {
        const scriptRequest = {
            ...mockRequest,
            submissionType: SubmissionType.SCRIPT,
            scriptFileName: 'test.js',
            scriptContent: undefined,
        };
        render(<ApprovalTable {...defaultProps} requests={[scriptRequest] as any[]} />);

        // Expand to see details
        const row = screen.getByText('Prod DB').closest('tr');
        if (!row) throw new Error('Row not found');
        fireEvent.click(row);

        expect(screen.getByTestId('code-viewer')).toHaveTextContent('Script content not available');
    });

    it('shows fallback when query is missing in expanded view', () => {
        const queryRequest = {
            ...mockRequest,
            query: undefined,
        };
        render(<ApprovalTable {...defaultProps} requests={[queryRequest] as any[]} />);

        // Expand to see details
        const row = screen.getByText('Prod DB').closest('tr');
        if (!row) throw new Error('Row not found');
        fireEvent.click(row);

        expect(screen.getByTestId('code-viewer')).toHaveTextContent('Query not available');
    });
});
