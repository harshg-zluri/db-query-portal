import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScriptForm } from './index';

describe('ScriptForm', () => {
    const defaultProps = {
        selectedFile: null,
        onFileSelect: vi.fn(),
    };

    it('renders file upload and documentation', () => {
        render(<ScriptForm {...defaultProps} />);
        expect(screen.getByText(/Upload Script/)).toBeInTheDocument();
        expect(screen.getByText(/Documentation/)).toBeInTheDocument();
        expect(screen.getByText(/Environment Variables/)).toBeInTheDocument();
    });

    it('shows selected file details', () => {
        const file = new File(['content'], 'script.js', { type: 'text/javascript' });
        render(<ScriptForm {...defaultProps} selectedFile={file} />);

        // It renders in FileUpload and in the detail card below
        expect(screen.getAllByText('script.js').length).toBeGreaterThan(0);
    });

    it('shows component error', () => {
        render(<ScriptForm {...defaultProps} error="File required" />);
        // FileUpload component logic renders the error
        expect(screen.getByText('File required')).toBeInTheDocument();
    });
});
