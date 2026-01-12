import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonText, SkeletonTableRow, SkeletonTable, SkeletonCard } from './index';

describe('Skeleton', () => {
    it('renders with default props', () => {
        const { container } = render(<Skeleton />);
        const skeleton = container.firstChild;
        expect(skeleton).toHaveClass('skeleton rounded-md'); // Default variant rectangular
    });

    it('renders variants correctly', () => {
        const { container, rerender } = render(<Skeleton variant="text" />);
        expect(container.firstChild).toHaveClass('h-4 rounded');

        rerender(<Skeleton variant="circular" />);
        expect(container.firstChild).toHaveClass('rounded-full');
    });

    it('applies custom dimensions', () => {
        const { container } = render(<Skeleton width={100} height="50%" />);
        const skeleton = container.firstChild as HTMLElement;
        expect(skeleton.style.width).toBe('100px');
        expect(skeleton.style.height).toBe('50%');
    });
});

describe('Skeleton Helpers', () => {
    it('renders SkeletonText with correct lines', () => {
        const { container } = render(<SkeletonText lines={5} />);
        const skeletons = container.querySelectorAll('.skeleton');
        expect(skeletons.length).toBe(5);
    });

    it('renders SkeletonTableRow with columns', () => {
        const { container } = render(
            <table>
                <tbody>
                    <SkeletonTableRow columns={4} />
                </tbody>
            </table>
        );
        const cells = container.querySelectorAll('td');
        expect(cells.length).toBe(4);
    });

    it('renders SkeletonTable with rows and columns', () => {
        const { container } = render(<SkeletonTable rows={3} columns={2} />);
        const ths = container.querySelectorAll('th');
        const trs = container.querySelectorAll('tbody tr');

        expect(ths.length).toBe(2);
        expect(trs.length).toBe(3);
    });

    it('renders SkeletonCard structure', () => {
        const { container } = render(<SkeletonCard />);
        const circular = container.querySelector('.rounded-full'); // Avatar
        const textSkeletons = container.querySelectorAll('.rounded'); // Text lines (header + body)

        expect(circular).toBeInTheDocument();
        expect(textSkeletons.length).toBeGreaterThan(0);
    });
});
