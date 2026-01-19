import { forwardRef, type SelectHTMLAttributes, useId } from 'react';
import { cn } from '@utils/cn';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options?: SelectOption[];
    placeholder?: string;
    isLoading?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, options = [], placeholder, required, isLoading, id, disabled, ...props }, ref) => {
        const generatedId = useId();
        const selectId = id || generatedId;

        return (
            <div className="space-y-1.5">
                {label && (
                    <label htmlFor={selectId} className="block text-sm font-medium text-zinc-700">
                        {label}
                        {required && <span className="text-[#EF4444] ml-0.5">*</span>}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        disabled={disabled || isLoading}
                        className={cn(
                            'w-full px-3 py-2 bg-white text-zinc-900',
                            'border border-zinc-200 rounded-md',
                            'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1',
                            'disabled:bg-zinc-50 disabled:text-zinc-500',
                            'transition-shadow duration-150',
                            'appearance-none',
                            error && 'border-[#EF4444] focus:ring-[#EF4444]',
                            className
                        )}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {isLoading && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    )}
                </div>
                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
