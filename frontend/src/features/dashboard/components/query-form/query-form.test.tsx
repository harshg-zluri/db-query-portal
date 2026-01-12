import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryEditor } from './index';
import { DatabaseType } from '@/types';

describe('QueryEditor', () => {
    const defaultProps = {
        value: 'SELECT * FROM users',
        onChange: vi.fn(),
        databaseType: DatabaseType.POSTGRESQL,
    };

    it('renders textarea with value', () => {
        render(<QueryEditor {...defaultProps} />);
        expect(screen.getByRole('textbox')).toHaveValue('SELECT * FROM users');
    });

    it('updates value on change', () => {
        render(<QueryEditor {...defaultProps} />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'NEW QUERY' } });
        expect(defaultProps.onChange).toHaveBeenCalledWith('NEW QUERY');
    });

    it('shows error message', () => {
        render(<QueryEditor {...defaultProps} error="Query is required" />);
        expect(screen.getByText('Query is required')).toBeInTheDocument();
    });

    it('shows appropriate placeholder for MongoDB', () => {
        render(<QueryEditor {...defaultProps} value="" databaseType={DatabaseType.MONGODB} />);
        expect(screen.getByPlaceholderText(/db.collection.find/)).toBeInTheDocument();
        expect(screen.getByText(/JavaScript syntax/)).toBeInTheDocument();
    });
});
