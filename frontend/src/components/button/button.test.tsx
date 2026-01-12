import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './index';

describe('Button', () => {
    it('renders children correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('handles onClick', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);

        fireEvent.click(screen.getByText('Click me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClick when disabled', () => {
        const handleClick = vi.fn();
        render(<Button disabled onClick={handleClick}>Click me</Button>);

        fireEvent.click(screen.getByText('Click me'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading state', () => {
        render(<Button isLoading>Click me</Button>);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('Click me')).not.toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('applies variant classes', () => {
        const { container } = render(<Button variant="danger">Delete</Button>);
        const button = container.firstChild as HTMLElement;
        expect(button).toHaveClass('bg-[#ef4444]');
    });
});
