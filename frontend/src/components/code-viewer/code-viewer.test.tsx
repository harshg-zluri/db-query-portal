import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CodeViewer } from './index';

// Mock clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(),
    },
});

describe('CodeViewer', () => {
    const sampleCode = 'SELECT * FROM users;';

    it('renders code content', () => {
        const { container } = render(<CodeViewer code={sampleCode} />);
        // Use textContent because syntax highlighting splits text into multiple spans
        expect(container.textContent).toContain('SELECT');
        expect(container.textContent).toContain('FROM');
        expect(container.textContent).toContain('users');
    });

    it('renders line numbers by default', () => {
        render(<CodeViewer code={sampleCode} />);
        const lineNumbers = screen.getByText('1');
        expect(lineNumbers).toBeInTheDocument();
    });

    it('hides line numbers when disabled', () => {
        render(<CodeViewer code={sampleCode} showLineNumbers={false} />);
        const lineNumbers = screen.queryByText('1');
        expect(lineNumbers).not.toBeInTheDocument();
    });

    it('copies to clipboard on click', async () => {
        render(<CodeViewer code={sampleCode} />);
        const copyButton = screen.getByTitle('Copy to clipboard');

        fireEvent.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleCode);

        // Check for success state
        await screen.findByTitle('Copied!');
    });

    it('handles copy failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Copy failed'));

        render(<CodeViewer code={sampleCode} />);
        const copyButton = screen.getByTitle('Copy to clipboard');

        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to copy:', expect.any(Error));
        });
        consoleSpy.mockRestore();
    });

    it('renders empty lines with placeholder', () => {
        const { container } = render(<CodeViewer code={'\n'} />);
        // Should contain non-breaking space or similar for empty line
        // We look for logic that handles empty line
        // CodeViewer implementation: {line || ' '}
        const rows = container.querySelectorAll('tr');
        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('1'); // Line number
        // Check availability of space
        expect(container.innerHTML).toContain(' ');
    });

    it('handles multiple lines', () => {
        const multiLineCode = 'Line 1\nLine 2\nLine 3';
        const { container } = render(<CodeViewer code={multiLineCode} />);
        expect(container.textContent).toContain('Line 1');
        expect(container.textContent).toContain('Line 2');
        expect(container.textContent).toContain('Line 3');
    });

    it('handles different languages', () => {
        const { container } = render(<CodeViewer code="{}" language="json" />);
        // It's hard to test actual hljs output without deep implementation details, 
        // but we can check if the class is applied to the code block if not using table
        // Or for table, check if `language-json` class exists on code element.

        // Since table view is default:
        const codeElement = container.querySelector('code');
        expect(codeElement).toHaveClass('language-json');
    });

    it('handles mongodb language mapping', () => {
        const { container } = render(<CodeViewer code="db.users.find()" language="mongodb" />);
        const codeElement = container.querySelector('code');
        expect(codeElement).toHaveClass('language-javascript');
    });
});
