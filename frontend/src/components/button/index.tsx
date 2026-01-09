import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
        const baseStyles = cn(
            'inline-flex items-center justify-center font-semibold rounded-md',
            'border-2 border-black',
            'shadow-[4px_4px_0_#000] hover:shadow-none',
            'hover:translate-x-[2px] hover:translate-y-[2px]',
            'active:translate-x-[4px] active:translate-y-[4px]',
            'transition-all duration-150 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-[#FEF34B] focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#000]'
        );

        const variants = {
            primary: 'bg-[#FEF34B] text-black hover:bg-[#FDE500]',
            secondary: 'bg-white text-black hover:bg-[#FAF9F6]',
            danger: 'bg-[#ef4444] text-white hover:bg-[#dc2626] border-black',
            ghost: 'bg-transparent text-black border-transparent shadow-none hover:bg-[#FAF9F6] hover:border-black hover:shadow-[4px_4px_0_#000]',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <>
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Loading...
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
