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
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div
            className={cn(
                'bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000]',
                'transition-all duration-200',
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
        <div className={cn('pb-4 border-b-2 border-black', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <h3 className={cn('text-lg font-bold text-black uppercase tracking-wide', className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn('text-sm text-[#404040] mt-1', className)}>
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
        <div className={cn('pt-4 border-t-2 border-black mt-4 flex justify-end gap-3', className)}>
            {children}
        </div>
    );
}
