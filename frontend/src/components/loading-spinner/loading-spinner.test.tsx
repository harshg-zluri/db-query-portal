import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner, LoadingPage } from './index';

describe('LoadingSpinner', () => {
    it('renders with default props', () => {
        const { container } = render(<LoadingSpinner />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveClass('h-6 w-6'); // Default size md
        expect(svg).toHaveClass('animate-spin');
    });

    it('renders with different sizes', () => {
        const { container, rerender } = render(<LoadingSpinner size="sm" />);
        expect(container.querySelector('svg')).toHaveClass('h-4 w-4');

        rerender(<LoadingSpinner size="lg" />);
        expect(container.querySelector('svg')).toHaveClass('h-8 w-8');
    });

    it('renders with custom class', () => {
        const { container } = render(<LoadingSpinner className="custom-spinner" />);
        expect(container.querySelector('svg')).toHaveClass('custom-spinner');
    });
});

describe('LoadingPage', () => {
    it('renders centered large spinner', () => {
        const { container } = render(<LoadingPage />);
        const wrapper = container.firstChild;
        expect(wrapper).toHaveClass('flex items-center justify-center min-h-[400px]');

        const svg = container.querySelector('svg');
        expect(svg).toHaveClass('h-8 w-8'); // Size lg
    });
});
