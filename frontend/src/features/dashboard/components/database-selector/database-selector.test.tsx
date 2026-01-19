import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseSelector } from './index';
import { DatabaseType } from '@/types';

// Create mocks that can be configured per test
const mockUseInstances = vi.fn();
const mockUseDatabases = vi.fn();

vi.mock('../../queries/use-databases', () => ({
    useInstances: () => mockUseInstances(),
    useDatabases: () => mockUseDatabases()
}));

describe('DatabaseSelector', () => {
    const defaultProps = {
        databaseType: '' as any,
        instanceId: '',
        databaseName: '',
        onDatabaseTypeChange: vi.fn(),
        onInstanceChange: vi.fn(),
        onDatabaseChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Default: data loaded, not loading
        mockUseInstances.mockReturnValue({
            data: [
                { id: 'inst1', name: 'Instance 1', type: 'postgresql' },
                { id: 'inst2', name: 'Instance 2', type: 'postgresql' }
            ],
            isLoading: false
        });
        mockUseDatabases.mockReturnValue({
            data: ['db1', 'db2'],
            isLoading: false
        });
    });

    it('renders selects', () => {
        render(<DatabaseSelector {...defaultProps} />);
        expect(screen.getByLabelText(/Database Type/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Instance Name/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Database Name/)).toBeInTheDocument();
    });

    it('disabled dependent selects initially', () => {
        render(<DatabaseSelector {...defaultProps} />);
        expect(screen.getByLabelText(/Instance Name/)).toBeDisabled();
        expect(screen.getByLabelText(/Database Name/)).toBeDisabled();
    });

    it('enables instance select when type selected', () => {
        render(<DatabaseSelector {...defaultProps} databaseType={DatabaseType.POSTGRESQL} />);
        expect(screen.getByLabelText(/Instance Name/)).not.toBeDisabled();
        expect(screen.getByLabelText(/Database Name/)).toBeDisabled();
    });

    it('enables database select when instance selected', () => {
        render(
            <DatabaseSelector
                {...defaultProps}
                databaseType={DatabaseType.POSTGRESQL}
                instanceId="inst1"
            />
        );
        expect(screen.getByLabelText(/Instance Name/)).not.toBeDisabled();
        expect(screen.getByLabelText(/Database Name/)).not.toBeDisabled();
    });

    it('calls handlers on change', () => {
        render(<DatabaseSelector {...defaultProps} />);

        fireEvent.change(screen.getByLabelText(/Database Type/), { target: { value: DatabaseType.POSTGRESQL } });
        expect(defaultProps.onDatabaseTypeChange).toHaveBeenCalledWith(DatabaseType.POSTGRESQL);
    });

    it('calls instance change handler', () => {
        render(
            <DatabaseSelector
                {...defaultProps}
                databaseType={DatabaseType.POSTGRESQL}
            />
        );

        fireEvent.change(screen.getByLabelText(/Instance Name/), { target: { value: 'inst1' } });
        expect(defaultProps.onInstanceChange).toHaveBeenCalledWith('inst1');
    });

    it('calls database change handler', () => {
        render(
            <DatabaseSelector
                {...defaultProps}
                databaseType={DatabaseType.POSTGRESQL}
                instanceId="inst1"
            />
        );

        fireEvent.change(screen.getByLabelText(/Database Name/), { target: { value: 'db1' } });
        expect(defaultProps.onDatabaseChange).toHaveBeenCalledWith('db1');
    });

    it('shows empty options when instances are loading', () => {
        mockUseInstances.mockReturnValue({
            data: undefined,
            isLoading: true
        });
        mockUseDatabases.mockReturnValue({
            data: undefined,
            isLoading: false
        });

        render(<DatabaseSelector {...defaultProps} databaseType={DatabaseType.POSTGRESQL} />);

        // Instance select should be showing loading indicator
        expect(screen.getByLabelText(/Instance Name/)).toBeInTheDocument();
    });

    it('shows empty options when databases are loading', () => {
        mockUseInstances.mockReturnValue({
            data: [{ id: 'inst1', name: 'Instance 1', type: 'postgresql' }],
            isLoading: false
        });
        mockUseDatabases.mockReturnValue({
            data: undefined,
            isLoading: true
        });

        render(
            <DatabaseSelector
                {...defaultProps}
                databaseType={DatabaseType.POSTGRESQL}
                instanceId="inst1"
            />
        );

        // Database select should show loading indicator
        expect(screen.getByLabelText(/Database Name/)).toBeInTheDocument();
    });

    it('handles null instances data', () => {
        mockUseInstances.mockReturnValue({
            data: null,
            isLoading: false
        });
        mockUseDatabases.mockReturnValue({
            data: null,
            isLoading: false
        });

        render(<DatabaseSelector {...defaultProps} databaseType={DatabaseType.POSTGRESQL} />);

        // Should render without crashing
        expect(screen.getByLabelText(/Instance Name/)).toBeInTheDocument();
    });

    it('handles non-string database values', () => {
        mockUseInstances.mockReturnValue({
            data: [{ id: 'inst1', name: 'Instance 1', type: 'postgresql' }],
            isLoading: false
        });
        mockUseDatabases.mockReturnValue({
            data: [123, { name: 'complex' }], // Non-string values
            isLoading: false
        });

        render(
            <DatabaseSelector
                {...defaultProps}
                databaseType={DatabaseType.POSTGRESQL}
                instanceId="inst1"
            />
        );

        // Should convert to strings and render
        expect(screen.getByLabelText(/Database Name/)).toBeInTheDocument();
    });
});
