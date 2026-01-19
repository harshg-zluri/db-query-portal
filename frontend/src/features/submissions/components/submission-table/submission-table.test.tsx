import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubmissionTable } from './index';
import { DatabaseType, RequestStatus } from '@/types';

// Mock empty components
vi.mock('@components/empty-state', () => ({
    NoSubmissionsEmpty: ({ onCreateNew }: any) => <button onClick={onCreateNew}>Create New</button>,
    NoResultsEmpty: ({ onClear }: any) => <button onClick={onClear}>Clear Filters</button>
}));

const mockRequests = [
    {
        id: 'req-1',
        instanceName: 'Inst1',
        databaseName: 'DB1',
        databaseType: DatabaseType.POSTGRESQL,
        query: 'SELECT 1',
        status: RequestStatus.PENDING,
        createdAt: '2023-01-01',
    },
    {
        id: 'req-2',
        instanceName: 'Inst2',
        databaseName: 'DB2',
        databaseType: DatabaseType.MONGODB,
        query: 'db.find()',
        status: RequestStatus.REJECTED, // Cloneable
        createdAt: '2023-01-02',
    }
];

describe('SubmissionTable', () => {
    const defaultProps = {
        requests: mockRequests as any[],
        isLoading: false,
        onView: vi.fn(),
        onClone: vi.fn(),
        onCreateNew: vi.fn(),
        isEmpty: false,
        hasFilters: false,
        onClearFilters: vi.fn(),
    };

    it('renders loading state', () => {
        render(<SubmissionTable {...defaultProps} isLoading={true} />);
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.queryByText('Inst1')).not.toBeInTheDocument();
    });

    it('renders empty state without filters', () => {
        render(<SubmissionTable {...defaultProps} isEmpty={true} />);
        // Shows NoSubmissionsEmpty
        fireEvent.click(screen.getByText('Create New'));
        expect(defaultProps.onCreateNew).toHaveBeenCalled();
    });

    it('renders empty state with filters', () => {
        render(<SubmissionTable {...defaultProps} isEmpty={true} hasFilters={true} />);
        // Shows NoResultsEmpty
        fireEvent.click(screen.getByText('Clear Filters'));
        expect(defaultProps.onClearFilters).toHaveBeenCalled();
    });

    it('renders table rows', () => {
        render(<SubmissionTable {...defaultProps} />);
        expect(screen.getByText('Inst1')).toBeInTheDocument();
        expect(screen.getByText('Inst2')).toBeInTheDocument();
        expect(screen.getByText('SQL')).toBeInTheDocument();
        expect(screen.getByText('Mongo')).toBeInTheDocument();
    });

    it('handles view action', () => {
        render(<SubmissionTable {...defaultProps} />);
        const viewButtons = screen.getAllByTitle('View details');
        fireEvent.click(viewButtons[0]);
        expect(defaultProps.onView).toHaveBeenCalledWith(mockRequests[0]);
    });

    it('handles clone action', () => {
        render(<SubmissionTable {...defaultProps} />);
        const cloneButton = screen.getByTitle('Clone & resubmit');
        fireEvent.click(cloneButton);
        expect(defaultProps.onClone).toHaveBeenCalledWith(mockRequests[1]);
    });

    it('hides clone button for uncloneable status', () => {
        render(<SubmissionTable {...defaultProps} />);
        // Only 1 clone button should exist (req-2 is rejected, req-1 is pending)
        expect(screen.getAllByTitle('Clone & resubmit')).toHaveLength(1);
    });

    it('shows script file name for script submissions', () => {
        const scriptRequest = {
            ...mockRequests[0],
            submissionType: 'script',
            scriptFileName: 'migration.js',
            query: undefined,
        };
        render(<SubmissionTable {...defaultProps} requests={[scriptRequest as any]} />);
        expect(screen.getByText('migration.js')).toBeInTheDocument();
    });

    it('shows fallback for script without filename', () => {
        const scriptRequest = {
            ...mockRequests[0],
            submissionType: 'script',
            scriptFileName: undefined,
            query: undefined,
        };
        render(<SubmissionTable {...defaultProps} requests={[scriptRequest as any]} />);
        expect(screen.getByText('Script file')).toBeInTheDocument();
    });

    it('truncates long queries', () => {
        const longQueryRequest = {
            ...mockRequests[0],
            query: 'SELECT * FROM users WHERE id = 123 AND status = active AND name LIKE pattern'
        };
        render(<SubmissionTable {...defaultProps} requests={[longQueryRequest as any]} />);
        // Should be truncated with ...
        expect(screen.getByText(/SELECT \* FROM users WHERE id = 123 AND s\.\.\./)).toBeInTheDocument();
    });
});
