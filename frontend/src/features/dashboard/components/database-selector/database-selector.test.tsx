import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DatabaseSelector } from './index';
import { DatabaseType } from '@/types';

// Mock queries
vi.mock('../../queries/use-databases', () => ({
    useInstances: () => ({
        data: [
            { id: 'inst1', name: 'Instance 1', type: 'postgresql' },
            { id: 'inst2', name: 'Instance 2', type: 'postgresql' }
        ],
        isLoading: false
    }),
    useDatabases: () => ({
        data: ['db1', 'db2'],
        isLoading: false
    })
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
});
