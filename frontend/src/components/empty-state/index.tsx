import { type ReactNode } from 'react';
import { cn } from '@utils/cn';
import { Button } from '@components/button';

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-12 px-4 text-center',
                className
            )}
        >
            {icon ? (
                <div className="text-[#0F172A] mb-4">{icon}</div>
            ) : (
                <div className="w-16 h-16 mb-4 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center ">
                    <svg
                        className="w-8 h-8 text-[#0F172A]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                </div>
            )}

            <h3 className="text-lg font-semibold text-[#0F172A] font-semibold mb-1">{title}</h3>

            {description && (
                <p className="text-sm text-[#64748B] max-w-sm mb-4">{description}</p>
            )}

            {action && (
                <Button onClick={action.onClick} variant="primary" size="sm">
                    {action.label}
                </Button>
            )}
        </div>
    );
}

// Preset empty states
export function NoSubmissionsEmpty({ onCreateNew }: { onCreateNew: () => void }) {
    return (
        <EmptyState
            icon={
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            }
            title="No submissions yet"
            description="Create your first query request to get started."
            action={{ label: 'Create Request', onClick: onCreateNew }}
        />
    );
}

export function NoPendingRequestsEmpty() {
    return (
        <EmptyState
            icon={
                <svg className="w-12 h-12 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            }
            title="All caught up!"
            description="No pending requests to review. Check back later."
        />
    );
}

export function NoResultsEmpty({ onClear }: { onClear?: () => void }) {
    return (
        <EmptyState
            icon={
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            }
            title="No results found"
            description="Try adjusting your filters or search query."
            action={onClear ? { label: 'Clear Filters', onClick: onClear } : undefined}
        />
    );
}
