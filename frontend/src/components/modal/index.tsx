import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from '@utils/cn';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 transition-opacity animate-fade-in"
                onClick={onClose}
            />

            {/* Modal container */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    ref={modalRef}
                    className={cn(
                        'relative w-full bg-white border-3 border-black rounded-md',
                        'shadow-[6px_6px_0_#000]',
                        'animate-scale-in',
                        sizes[size]
                    )}
                    style={{ borderWidth: '3px' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    {(title || showCloseButton) && (
                        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black">
                            {title && (
                                <h2 className="text-lg font-bold text-black uppercase tracking-wide">{title}</h2>
                            )}
                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className={cn(
                                        'p-2 text-black border-2 border-black rounded-md',
                                        'shadow-[2px_2px_0_#000] hover:shadow-none',
                                        'hover:translate-x-[2px] hover:translate-y-[2px]',
                                        'hover:bg-[#FAF9F6]',
                                        'transition-all duration-150'
                                    )}
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <div className="px-6 py-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex justify-end gap-3 pt-4 mt-4 border-t-2 border-black', className)}>
            {children}
        </div>
    );
}
