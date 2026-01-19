import { type ReactNode } from 'react';
import { cn } from '@utils/cn';

export interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    animated?: boolean;
}

export function Card({ children, className, padding = 'md', animated = false }: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    };

    return (
        <div
            className={cn(
                'bg-white rounded-lg border border-zinc-200',
                paddingStyles[padding],
                animated && 'animate-slide-up',
                className
            )}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('pb-4 border-b border-zinc-200', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <h3 className={cn('text-lg font-semibold text-zinc-900', className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn('text-sm text-[#64748B] mt-0.5', className)}>
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
        <div className={cn('pt-4 border-t border-zinc-200 mt-4 flex justify-end gap-2', className)}>
            {children}
        </div>
    );
}
