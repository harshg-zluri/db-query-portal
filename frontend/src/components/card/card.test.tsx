import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './index';

describe('Card Component', () => {
    it('renders with default props', () => {
        render(<Card>Card Content</Card>);
        const card = screen.getByText('Card Content');
        expect(card).toBeInTheDocument();
        expect(card).toHaveClass('p-4'); // Default padding md
    });

    it('renders with custom class', () => {
        render(<Card className="custom-class">Content</Card>);
        const card = screen.getByText('Content');
        expect(card).toHaveClass('custom-class');
    });

    it('renders with different padding variants', () => {
        const { rerender } = render(<Card padding="none">Content</Card>);
        expect(screen.getByText('Content')).not.toHaveClass('p-4');
        expect(screen.getByText('Content')).not.toHaveClass('p-3');
        expect(screen.getByText('Content')).not.toHaveClass('p-6');

        rerender(<Card padding="sm">Content</Card>);
        expect(screen.getByText('Content')).toHaveClass('p-3');

        rerender(<Card padding="lg">Content</Card>);
        expect(screen.getByText('Content')).toHaveClass('p-6');
    });

    it('renders with animation', () => {
        render(<Card animated={true}>Content</Card>);
        const card = screen.getByText('Content');
        expect(card).toHaveClass('animate-slide-up');
    });
});

describe('Card Subcomponents', () => {
    it('renders CardHeader', () => {
        render(<CardHeader>Header</CardHeader>);
        expect(screen.getByText('Header')).toHaveClass('pb-4 border-b-2');
    });

    it('renders CardTitle', () => {
        render(<CardTitle>Title</CardTitle>);
        const title = screen.getByText('Title');
        expect(title.tagName).toBe('H3');
        expect(title).toHaveClass('text-lg font-bold');
    });

    it('renders CardDescription', () => {
        render(<CardDescription>Description</CardDescription>);
        const desc = screen.getByText('Description');
        expect(desc.tagName).toBe('P');
        expect(desc).toHaveClass('text-sm text-[#404040]');
    });

    it('renders CardContent', () => {
        render(<CardContent>Content</CardContent>);
        expect(screen.getByText('Content')).toHaveClass('pt-4');
    });

    it('renders CardFooter', () => {
        render(<CardFooter>Footer</CardFooter>);
        expect(screen.getByText('Footer')).toHaveClass('pt-4 border-t-2');
    });
});
