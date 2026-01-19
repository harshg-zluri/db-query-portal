import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ApprovalActions } from './index';
import userEvent from '@testing-library/user-event';

describe('ApprovalActions', () => {
    const defaultProps = {
        requestId: 'req-123',
        onApprove: vi.fn(),
        onReject: vi.fn(),
        isApproving: false,
        isRejecting: false,
        hasWarnings: false,
    };

    it('renders approve and reject buttons', () => {
        render(<ApprovalActions {...defaultProps} />);
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    });

    it('handles direct approval when no warnings', () => {
        render(<ApprovalActions {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
        expect(defaultProps.onApprove).toHaveBeenCalledWith('req-123');
    });

    it('shows confirmation modal for approval with warnings', () => {
        render(<ApprovalActions {...defaultProps} hasWarnings={true} />);

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

        // Modal should appear
        expect(screen.getByText('Confirm Approval')).toBeInTheDocument();
        expect(screen.getByText(/security warnings/)).toBeInTheDocument();

        // Confirming the modal triggers onApprove
        fireEvent.click(screen.getByRole('button', { name: 'Yes, Approve' }));
        expect(defaultProps.onApprove).toHaveBeenCalledWith('req-123');
    });

    it('opens reject modal and submits reason', async () => {
        render(<ApprovalActions {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

        // Check for modal title (and button)
        expect(screen.getAllByText('Reject Request').length).toBeGreaterThan(0);

        const input = screen.getByPlaceholderText('Provide a reason for rejection...');
        await userEvent.type(input, 'Policy violation');

        // Target the submit button specifically, ideally distinguishable from the Title
        // The modal title is "Reject Request", the button is "Reject Request".
        // Use getAllByText and pick last, or cleaner: select by class or role if possible.
        // Assuming the button is the one inside the footer.
        const buttons = screen.getAllByRole('button', { name: 'Reject Request' });
        fireEvent.click(buttons[buttons.length - 1]);

        expect(defaultProps.onReject).toHaveBeenCalledWith('req-123', 'Policy violation');
    });

    it('disables buttons during loading', () => {
        render(<ApprovalActions {...defaultProps} isApproving={true} />);
        // Button text changes to Loading...
        expect(screen.getByRole('button', { name: /Loading/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    });

    it('closes approve confirmation modal on cancel', () => {
        render(<ApprovalActions {...defaultProps} hasWarnings={true} />);

        fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
        expect(screen.getByText('Confirm Approval')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByText('Confirm Approval')).not.toBeInTheDocument();
    });

    it('closes reject modal on cancel', () => {
        render(<ApprovalActions {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
        expect(screen.getAllByText('Reject Request').length).toBeGreaterThan(0);

        // Click cancel button (not the "Reject Request" button)
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByPlaceholderText('Provide a reason for rejection...')).not.toBeInTheDocument();
    });

    it('rejects without reason when textarea is empty', async () => {
        render(<ApprovalActions {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

        const buttons = screen.getAllByRole('button', { name: 'Reject Request' });
        fireEvent.click(buttons[buttons.length - 1]);

        expect(defaultProps.onReject).toHaveBeenCalledWith('req-123', undefined);
    });

    it('disables approve during rejecting', () => {
        render(<ApprovalActions {...defaultProps} isRejecting={true} />);
        expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    });
});
