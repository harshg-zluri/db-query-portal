import { useCallback, useState } from 'react';
import { cn } from '@utils/cn';

export interface FileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSize?: number; // in bytes
    className?: string;
    disabled?: boolean;
    error?: string;
    selectedFile?: File | null;
}

export function FileUpload({
    onFileSelect,
    accept = '.js',
    maxSize = 5 * 1024 * 1024, // 5MB default
    className,
    disabled,
    error,
    selectedFile,
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleFile = useCallback(
        (file: File) => {
            setLocalError(null);

            // Validate file type
            if (accept && !file.name.endsWith(accept.replace('*', ''))) {
                setLocalError(`Please upload a ${accept} file`);
                return;
            }

            // Validate file size
            if (file.size > maxSize) {
                setLocalError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
                return;
            }

            onFileSelect(file);
        },
        [accept, maxSize, onFileSelect]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            if (disabled) return;

            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [disabled, handleFile]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
        },
        [disabled]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const displayError = error || localError;

    return (
        <div className={cn('space-y-2', className)}>
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    'relative border-2 border-dashed rounded-md transition-all duration-150',
                    'flex flex-col items-center justify-center py-8 px-4',
                    disabled
                        ? 'opacity-50 cursor-not-allowed border-[#9CA3AF] bg-[#F8FAFC]'
                        : isDragging
                            ? 'border-[#5791FF] bg-[#DBEAFE] shadow-sm'
                            : displayError
                                ? 'border-[#ef4444] bg-[#FEE2E2]'
                                : selectedFile
                                    ? 'border-[#22c55e] bg-[#DCFCE7] '
                                    : 'border-[#E2E8F0] bg-white hover: hover:border-[#E2E8F0]'
                )}
            >
                <input
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />

                {selectedFile ? (
                    <>
                        <svg
                            className="w-8 h-8 text-[#22c55e] mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <p className="text-sm font-semibold text-[#0F172A]">{selectedFile.name}</p>
                        <p className="text-xs text-[#64748B] mt-1">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                    </>
                ) : (
                    <>
                        <svg
                            className="w-8 h-8 text-[#0F172A] mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <p className="text-sm text-[#0F172A]">
                            <span className="font-semibold text-[#5791FF]">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-[#64748B] mt-1">
                            {accept} files up to {Math.round(maxSize / 1024 / 1024)}MB
                        </p>
                    </>
                )}
            </div>

            {displayError && <p className="text-sm text-[#ef4444] font-medium">{displayError}</p>}
        </div>
    );
}
