import { RequestStatus } from '@/types';
import { cn } from '@utils/cn';

export interface StatusBadgeProps {
    status: RequestStatus;
    className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string; icon: string }> = {
    [RequestStatus.PENDING]: {
        label: 'Pending',
        className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        icon: '⏳',
    },
    [RequestStatus.APPROVED]: {
        label: 'Approved',
        className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        icon: '✓',
    },
    [RequestStatus.REJECTED]: {
        label: 'Rejected',
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
        icon: '✗',
    },
    [RequestStatus.EXECUTED]: {
        label: 'Executed',
        className: 'bg-green-500/10 text-green-500 border-green-500/20',
        icon: '✓',
    },
    [RequestStatus.FAILED]: {
        label: 'Failed',
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
        icon: '⚠',
    },
    [RequestStatus.WITHDRAWN]: {
        label: 'Withdrawn',
        className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        icon: '↩',
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border',
                config.className,
                className
            )}
        >
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
}
