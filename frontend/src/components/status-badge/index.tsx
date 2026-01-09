import { RequestStatus } from '@/types';
import { cn } from '@utils/cn';

export interface StatusBadgeProps {
    status: RequestStatus;
    className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string; icon: string }> = {
    [RequestStatus.PENDING]: {
        label: 'Pending',
        className: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]',
        icon: '⏳',
    },
    [RequestStatus.APPROVED]: {
        label: 'Approved',
        className: 'bg-[#DBEAFE] text-[#1E40AF] border-[#3B82F6]',
        icon: '✓',
    },
    [RequestStatus.REJECTED]: {
        label: 'Rejected',
        className: 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]',
        icon: '✗',
    },
    [RequestStatus.EXECUTED]: {
        label: 'Executed',
        className: 'bg-[#DCFCE7] text-[#166534] border-[#22C55E]',
        icon: '✓',
    },
    [RequestStatus.FAILED]: {
        label: 'Failed',
        className: 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]',
        icon: '⚠',
    },
    [RequestStatus.WITHDRAWN]: {
        label: 'Withdrawn',
        className: 'bg-[#F3F4F6] text-[#374151] border-[#6B7280]',
        icon: '↩',
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wide',
                'rounded-md border-2 shadow-[2px_2px_0_#000]',
                'transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]',
                config.className,
                className
            )}
        >
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
}
