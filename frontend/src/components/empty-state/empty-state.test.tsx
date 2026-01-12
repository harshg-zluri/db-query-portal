import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState, NoSubmissionsEmpty, NoPendingRequestsEmpty, NoResultsEmpty } from './index';

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(<EmptyState title="Nothing here" description="Go away" />);
        expect(screen.getByText('Nothing here')).toBeInTheDocument();
        expect(screen.getByText('Go away')).toBeInTheDocument();
    });

    it('renders default icon when none provided', () => {
        const { container } = render(<EmptyState title="Title" />);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('renders custom icon', () => {
        const CustomIcon = <span data-testid="custom-icon">Icon</span>;
        render(<EmptyState title="Title" icon={CustomIcon} />);
        expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('renders action button and handles click', () => {
        const handleClick = vi.fn();
        render(<EmptyState title="Title" action={{ label: 'Do it', onClick: handleClick }} />);

        const button = screen.getByText('Do it');
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalled();
    });
});

describe('EmptyState Presets', () => {
    it('renders NoSubmissionsEmpty', () => {
        const handleCreate = vi.fn();
        render(<NoSubmissionsEmpty onCreateNew={handleCreate} />);

        expect(screen.getByText('No submissions yet')).toBeInTheDocument();

        const button = screen.getByText('Create Request');
        fireEvent.click(button);
        expect(handleCreate).toHaveBeenCalled();
    });

    it('renders NoPendingRequestsEmpty', () => {
        render(<NoPendingRequestsEmpty />);
        expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    it('renders NoResultsEmpty', () => {
        const handleClear = vi.fn();
        render(<NoResultsEmpty onClear={handleClear} />);

        expect(screen.getByText('No results found')).toBeInTheDocument();

        const button = screen.getByText('Clear Filters');
        fireEvent.click(button);
        expect(handleClear).toHaveBeenCalled();
    });

    it('renders NoResultsEmpty without action', () => {
        render(<NoResultsEmpty />);
        expect(screen.getByText('No results found')).toBeInTheDocument();
        expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });
});
