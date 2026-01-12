import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileUpload } from './index';

describe('FileUpload', () => {
    it('renders default state correctly', () => {
        render(<FileUpload onFileSelect={() => { }} />);
        expect(screen.getByText(/Click to upload/)).toBeInTheDocument();
        expect(screen.getByText(/or drag and drop/)).toBeInTheDocument();
    });

    it('handles file selection via input', () => {
        const handleSelect = vi.fn();
        const { container } = render(<FileUpload onFileSelect={handleSelect} />);

        const file = new File(['hello'], 'hello.js', { type: 'text/javascript' });
        const input = container.querySelector('input[type="file"]');

        if (!input) throw new Error('Input not found');

        fireEvent.change(input, { target: { files: [file] } });
        expect(handleSelect).toHaveBeenCalledWith(file);
    });

    it('validates file type', () => {
        const handleSelect = vi.fn();
        render(<FileUpload onFileSelect={handleSelect} accept=".js" />);

        const file = new File(['content'], 'test.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        expect(handleSelect).not.toHaveBeenCalled();
        expect(screen.getByText(/Please upload a .js file/)).toBeInTheDocument();
    });

    it('validates file size', () => {
        const handleSelect = vi.fn();
        const maxSize = 100; // bytes
        render(<FileUpload onFileSelect={handleSelect} maxSize={maxSize} />);

        // Create large file
        const file = new File(['a'.repeat(200)], 'large.js');
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(input, { target: { files: [file] } });

        expect(handleSelect).not.toHaveBeenCalled();
        expect(screen.getByText(/File size must be less than/)).toBeInTheDocument();
    });

    it('displays selected file state', () => {
        const file = new File(['content'], 'test.js');
        render(<FileUpload onFileSelect={() => { }} selectedFile={file} />);

        expect(screen.getByText('test.js')).toBeInTheDocument();
        // Check for success style (simplified check for class presence or color)
        const container = screen.getByText('test.js').closest('div');
        expect(container).toHaveClass('bg-[#DCFCE7]');
    });

    it('handles drag and drop events', () => {
        render(<FileUpload onFileSelect={() => { }} />);
        const dropzone = document.querySelector('.relative.border-2'); // wrapper

        if (!dropzone) throw new Error('Dropzone not found');

        // Drag Enter
        fireEvent.dragOver(dropzone);
        expect(dropzone).toHaveClass('bg-[#DBEAFE]'); // Active drag style

        // Drag Leave
        fireEvent.dragLeave(dropzone);
        expect(dropzone).not.toHaveClass('bg-[#DBEAFE]');

        // Drop
        const file = new File(['content'], 'dropped.js');
        const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [file] }
        });

        fireEvent(dropzone, dropEvent);
    });

    it('ignores events when disabled', () => {
        const handleSelect = vi.fn();
        render(<FileUpload onFileSelect={handleSelect} disabled />);

        const dropzone = document.querySelector('.relative.border-2');
        if (!dropzone) throw new Error('Dropzone not found');

        // Drag Over should not change state
        fireEvent.dragOver(dropzone);
        expect(dropzone).not.toHaveClass('bg-[#DBEAFE]');

        // Drop should be ignored
        const file = new File(['content'], 'dropped.js');
        const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [file] }
        });
        fireEvent(dropzone, dropEvent);
        expect(handleSelect).not.toHaveBeenCalled();
    });

    it('handles input change with no text', () => {
        const handleSelect = vi.fn();
        const { container } = render(<FileUpload onFileSelect={handleSelect} />);

        const input = container.querySelector('input[type="file"]');
        if (!input) throw new Error('Input not found');

        fireEvent.change(input, { target: { files: [] } });
        expect(handleSelect).not.toHaveBeenCalled();
    });

    it('handles drop with no files', () => {
        const handleSelect = vi.fn();
        render(<FileUpload onFileSelect={handleSelect} />);
        const dropzone = document.querySelector('.relative.border-2');
        if (!dropzone) throw new Error('Dropzone not found');

        const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [] }
        });
        fireEvent(dropzone, dropEvent);
        expect(handleSelect).not.toHaveBeenCalled();
    });
});
