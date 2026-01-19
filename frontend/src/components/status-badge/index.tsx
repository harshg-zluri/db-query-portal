import { RequestStatus } from '@/types';
import { cn } from '@utils/cn';

export interface StatusBadgeProps {
    status: RequestStatus;
    className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; icon: string; className: string }> = {
    [RequestStatus.PENDING]: {
        label: 'Pending',
        icon: '⏳',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    [RequestStatus.APPROVED]: {
        label: 'Approved',
        icon: '✅',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    [RequestStatus.REJECTED]: {
        label: 'Rejected',
        icon: '❌',
        className: 'bg-red-100 text-red-800 border-red-200',
    },
    [RequestStatus.EXECUTED]: {
        label: 'Executed',
        icon: '🚀',
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    [RequestStatus.FAILED]: {
        label: 'Failed',
        icon: '⚠️',
        className: 'bg-red-100 text-red-800 border-red-200',
    },
    [RequestStatus.WITHDRAWN]: {
        label: 'Withdrawn',
        icon: '🚫',
        className: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 text-xs font-medium',
                'rounded border',
                config.className,
                className
            )}
        >

            <span>{config.label}</span>
            <span className="ml-1">{config.icon}</span>
        </span>
    );
}
