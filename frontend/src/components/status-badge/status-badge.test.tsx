import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './index';
import { RequestStatus } from '@/types';

describe('StatusBadge', () => {
    it('renders each status correctly', () => {
        const { rerender } = render(<StatusBadge status={RequestStatus.PENDING} />);
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('⏳')).toBeInTheDocument();
        // The badge is the container that has the class.
        // Since the component structure is <span class="badge"><span>icon</span>Label</span>
        // screen.getByText('Pending') finds the outer span because 'Pending' is a text node info it.
        // However, let's be more precise.
        const badge = screen.getByText(/Pending/).closest('span.inline-flex');
        expect(badge).toHaveClass('bg-amber-100');

        rerender(<StatusBadge status={RequestStatus.APPROVED} />);
        expect(screen.getByText('Approved').closest('span.inline-flex')).toHaveClass('bg-blue-100');

        rerender(<StatusBadge status={RequestStatus.REJECTED} />);
        expect(screen.getByText('Rejected').closest('span.inline-flex')).toHaveClass('bg-red-100');

        rerender(<StatusBadge status={RequestStatus.EXECUTED} />);
        expect(screen.getByText('Executed').closest('span.inline-flex')).toHaveClass('bg-green-100');

        rerender(<StatusBadge status={RequestStatus.FAILED} />);
        expect(screen.getByText('Failed').closest('span.inline-flex')).toHaveClass('bg-red-100');

        rerender(<StatusBadge status={RequestStatus.WITHDRAWN} />);
        expect(screen.getByText('Withdrawn').closest('span.inline-flex')).toHaveClass('bg-zinc-100');
    });

    it('renders with custom class', () => {
        render(<StatusBadge status={RequestStatus.PENDING} className="custom-badge" />);
        const badge = screen.getByText('Pending').closest('span.inline-flex');
        expect(badge).toHaveClass('custom-badge');
    });
});
