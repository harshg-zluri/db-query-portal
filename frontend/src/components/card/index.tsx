import { type ReactNode } from 'react';
import { cn } from '@utils/cn';

export interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md' }: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div
            className={cn(
                'bg-[#111113] border border-[#27272a] rounded-lg',
                paddingStyles[padding],
                className
            )}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('pb-4 border-b border-[#27272a]', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <h3 className={cn('text-lg font-semibold text-zinc-100', className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn('text-sm text-zinc-400 mt-1', className)}>
            {children}
        </p>
    );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('pt-4', className)}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('pt-4 border-t border-[#27272a] mt-4 flex justify-end gap-3', className)}>
            {children}
        </div>
    );
}
