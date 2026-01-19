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

    it('renders script submission type correctly', () => {
        const scriptRequest = {
            ...mockRequest,
            submissionType: SubmissionType.SCRIPT,
            scriptFileName: 'test.js',
            scriptContent: 'console.log("hello")',
        };
        render(<SubmissionDetailModal {...defaultProps} request={scriptRequest as any} />);
        expect(screen.getByText(/Script: test\.js/)).toBeInTheDocument();
        const codeViewer = screen.getByTestId('code-viewer');
        expect(codeViewer).toHaveTextContent('console.log("hello")');
    });

    it('renders compressed result with download link', () => {
        const compressedRequest = {
            ...mockRequest,
            status: RequestStatus.EXECUTED,
            executionResult: 'compressed_data',
            isCompressed: true,
        };
        render(<SubmissionDetailModal {...defaultProps} request={compressedRequest as any} />);
        expect(screen.getByText('Execution Result')).toBeInTheDocument();
        expect(screen.getByText(/Result is large and stored compressed/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Download Result/ })).toBeInTheDocument();
    });

    it('renders execution error', () => {
        const errRequest = {
            ...mockRequest,
            status: RequestStatus.EXECUTED,
            executionError: 'Syntax error near line 1',
        };
        render(<SubmissionDetailModal {...defaultProps} request={errRequest as any} />);
        expect(screen.getByText('Execution Error')).toBeInTheDocument();
        expect(screen.getByText('Syntax error near line 1')).toBeInTheDocument();
    });

    it('renders approver info for approved request', () => {
        const approvedRequest = {
            ...mockRequest,
            status: RequestStatus.APPROVED,
            approverEmail: 'manager@example.com',
        };
        render(<SubmissionDetailModal {...defaultProps} request={approvedRequest as any} />);
        expect(screen.getByText('Approved by')).toBeInTheDocument();
        expect(screen.getByText('manager@example.com')).toBeInTheDocument();
    });

    it('renders rejector info for rejected request', () => {
        const rejectedRequest = {
            ...mockRequest,
            status: RequestStatus.REJECTED,
            approverEmail: 'manager@example.com',
        };
        render(<SubmissionDetailModal {...defaultProps} request={rejectedRequest as any} />);
        expect(screen.getByText('Rejected by')).toBeInTheDocument();
        expect(screen.getByText('manager@example.com')).toBeInTheDocument();
    });

    it('handles MongoDB database type correctly', () => {
        const mongoRequest = {
            ...mockRequest,
            databaseType: DatabaseType.MONGODB,
            query: 'db.users.find({})',
        };
        render(<SubmissionDetailModal {...defaultProps} request={mongoRequest as any} />);
        const codeViewer = screen.getByTestId('code-viewer');
        expect(codeViewer).toHaveTextContent('db.users.find({})');
    });

    it('hides withdraw button when onWithdraw is not provided', () => {
        render(<SubmissionDetailModal {...defaultProps} onWithdraw={undefined} />);
        expect(screen.queryByRole('button', { name: 'Withdraw Request' })).not.toBeInTheDocument();
    });

    it('shows fallback for missing script content', () => {
        const scriptRequest = {
            ...mockRequest,
            submissionType: SubmissionType.SCRIPT,
            scriptFileName: 'test.js',
            scriptContent: undefined, // No script content
        };
        render(<SubmissionDetailModal {...defaultProps} request={scriptRequest as any} />);
        expect(screen.getByTestId('code-viewer')).toHaveTextContent('Script content not available');
    });

    it('shows fallback for missing query', () => {
        const queryRequest = {
            ...mockRequest,
            query: undefined, // No query
        };
        render(<SubmissionDetailModal {...defaultProps} request={queryRequest as any} />);
        expect(screen.getByTestId('code-viewer')).toHaveTextContent('Query not available');
    });

    it('handles download result interaction successfully', async () => {
        const compressedRequest = {
            ...mockRequest,
            status: RequestStatus.EXECUTED,
            executionResult: 'compressed_data',
            isCompressed: true,
            id: 'req-123'
        };

        // Mock window APIs
        const mockFetch = vi.fn(() => Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob(['{"data":1}']))
        }));
        global.fetch = mockFetch as any;
        global.URL.createObjectURL = vi.fn(() => 'blob:url');
        global.URL.revokeObjectURL = vi.fn();

        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        // Mock Storage
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ state: { token: 'test-token' } }));

        render(<SubmissionDetailModal {...defaultProps} request={compressedRequest as any} />);

        const downloadBtn = screen.getByRole('button', { name: /Download Result/ });
        fireEvent.click(downloadBtn);

        // Verify interactions
        await vi.waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/requests/req-123/download-result'),
                expect.objectContaining({
                    headers: { Authorization: 'Bearer test-token' }
                })
            );
        });

        await vi.waitFor(() => {
            expect(appendChildSpy).toHaveBeenCalled();
        });

        const anchorCall = appendChildSpy.mock.calls.find(call => (call[0] as HTMLElement).tagName === 'A');
        expect(anchorCall).toBeDefined();
        const appendedElement = anchorCall![0] as HTMLAnchorElement;

        expect(appendedElement.download).toBe('result_req-123.json');

        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
        expect(removeChildSpy).toHaveBeenCalledWith(appendedElement);

        // Cleanup
        vi.restoreAllMocks();
    });

    it('shows alert if token is missing during download', async () => {
        const compressedRequest = {
            ...mockRequest,
            status: RequestStatus.EXECUTED,
            executionResult: 'compressed',
            isCompressed: true
        };
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null); // No token

        render(<SubmissionDetailModal {...defaultProps} request={compressedRequest as any} />);

        fireEvent.click(screen.getByRole('button', { name: /Download Result/ }));

        await vi.waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Please log in'));
        });

        alertSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('shows alert if download fetch fails', async () => {
        const compressedRequest = { ...mockRequest, status: RequestStatus.EXECUTED, executionResult: 'comp', isCompressed: true };

        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ state: { token: 'token' } }));
        global.fetch = vi.fn(() => Promise.resolve({ ok: false })) as any;
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(<SubmissionDetailModal {...defaultProps} request={compressedRequest as any} />);

        fireEvent.click(screen.getByRole('button', { name: /Download Result/ }));

        await vi.waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to download'));
        });

        alertSpy.mockRestore();
        consoleSpy.mockRestore();
        vi.restoreAllMocks();
    });
});
