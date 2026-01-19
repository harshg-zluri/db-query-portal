import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
        const baseStyles = cn(
            'inline-flex items-center justify-center font-medium rounded-md cursor-pointer',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed'
        );

        const variants = {
            primary: cn(
                'bg-zinc-900 text-white',
                'hover:bg-zinc-700',
                'focus:ring-zinc-900'
            ),
            secondary: cn(
                'bg-white text-zinc-700 border border-zinc-300',
                'hover:bg-zinc-50',
                'focus:ring-zinc-400'
            ),
            success: cn(
                'bg-green-600 text-white',
                'hover:bg-green-700',
                'focus:ring-green-600'
            ),
            danger: cn(
                'bg-[#EF4444] text-white',
                'hover:bg-red-700',
                'focus:ring-red-600'
            ),
            ghost: cn(
                'bg-transparent text-zinc-600',
                'hover:bg-zinc-100 hover:text-zinc-900',
                'focus:ring-zinc-400'
            ),
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-5 py-2.5 text-sm',
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
