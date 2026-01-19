import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '@utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, type = 'text', required, id, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id || generatedId;

        return (
            <div className="space-y-1.5">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-zinc-700">
                        {label}
                        {required && <span className="text-[#EF4444] ml-0.5">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    type={type}
                    className={cn(
                        'w-full px-3 py-2 bg-white text-zinc-900',
                        'border border-zinc-200 rounded-md',
                        'placeholder:text-zinc-400',
                        'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1',
                        'disabled:bg-zinc-50 disabled:text-zinc-500',
                        'transition-shadow duration-150',
                        error && 'border-[#EF4444] focus:ring-[#EF4444]',
                        className
                    )}
                    {...props}
                />
                {hint && !error && (
                    <p className="text-sm text-zinc-500 mt-0.5">{hint}</p>
                )}
                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
