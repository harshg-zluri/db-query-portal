import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Select } from './index';

describe('Select', () => {
    const options = [
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2' },
    ];

    it('renders with label and options', () => {
        render(<Select label="Test Select" options={options} />);
        expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getAllByRole('option').length).toBe(2);
    });

    it('renders placeholder', () => {
        render(<Select options={options} placeholder="Select item" />);
        expect(screen.getByText('Select item')).toBeInTheDocument();
    });

    it('handles change events', () => {
        const handleChange = vi.fn();
        render(<Select options={options} onChange={handleChange} />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '2' } });

        expect(handleChange).toHaveBeenCalled();
        expect(select).toHaveValue('2');
    });

    it('displays error message', () => {
        render(<Select options={options} error="Invalid selection" />);
        expect(screen.getByText('Invalid selection')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveClass('border-[#ef4444]');
    });

    it('shows loading state', () => {
        render(<Select options={options} isLoading={true} placeholder="Select..." />);

        const select = screen.getByRole('combobox');
        expect(select).toBeDisabled();
        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // Spinner check (class check)
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('renders required asterisk', () => {
        render(<Select options={options} label="Required Field" required />);
        expect(screen.getByText('*')).toHaveClass('text-[#ef4444]');
    });
});
