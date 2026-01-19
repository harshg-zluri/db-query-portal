import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './index';

describe('Input', () => {
    it('renders correctly', () => {
        render(<Input placeholder="Enter text" />);
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('displays label', () => {
        render(<Input label="Email Address" />);
        expect(screen.getByText('Email Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    it('handles onChange', () => {
        const handleChange = vi.fn();
        render(<Input onChange={handleChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test' } });

        expect(handleChange).toHaveBeenCalled();
        expect(input).toHaveValue('test');
    });

    it('displays error message', () => {
        render(<Input error="Invalid email" />);
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('border-[#EF4444]');
    });

    it('displays hint', () => {
        render(<Input hint="Enter your work email" />);
        expect(screen.getByText('Enter your work email')).toBeInTheDocument();
    });

    it('shows required asterisk', () => {
        render(<Input label="Name" required />);
        expect(screen.getByText('*')).toBeInTheDocument();
    });
});
