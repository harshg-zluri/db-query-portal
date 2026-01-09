import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="space-y-2">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-semibold text-black uppercase tracking-wide"
                    >
                        {label}
                        {props.required && <span className="text-[#ef4444] ml-1">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        'w-full px-3 py-2.5 bg-white border-2 rounded-md text-black placeholder-[#6B6B6B]',
                        'focus:outline-none focus:ring-2 focus:ring-[#FEF34B] focus:ring-offset-1',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#FAF9F6]',
                        'transition-all duration-150',
                        'hover:shadow-[2px_2px_0_#000] focus:shadow-[2px_2px_0_#000]',
                        error ? 'border-[#ef4444]' : 'border-black',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-[#ef4444] font-medium">{error}</p>
                )}
                {hint && !error && (
                    <p className="text-sm text-[#6B6B6B]">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
