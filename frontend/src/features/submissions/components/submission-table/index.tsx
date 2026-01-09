import type { QueryRequest } from '@/types';
import { DatabaseType, SubmissionType } from '@/types';
import { StatusBadge } from '@components/status-badge';
import { SkeletonTable } from '@components/skeleton';
import { NoSubmissionsEmpty, NoResultsEmpty } from '@components/empty-state';
import { formatDateShort } from '@utils/format-date';

interface SubmissionTableProps {
    requests: QueryRequest[];
    isLoading: boolean;
    onView: (request: QueryRequest) => void;
    onClone: (request: QueryRequest) => void;
    onCreateNew: () => void;
    isEmpty: boolean;
    hasFilters: boolean;
    onClearFilters?: () => void;
}

export function SubmissionTable({
    requests,
    isLoading,
    onView,
    onClone,
    onCreateNew,
    isEmpty,
    hasFilters,
    onClearFilters,
}: SubmissionTableProps) {
    if (isLoading) {
        return (
            <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000] overflow-hidden">
                <SkeletonTable rows={5} columns={6} />
            </div>
        );
    }

    if (isEmpty) {
        if (hasFilters) {
            return (
                <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000]">
                    <NoResultsEmpty onClear={onClearFilters} />
                </div>
            );
        }
        return (
            <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000]">
                <NoSubmissionsEmpty onCreateNew={onCreateNew} />
            </div>
        );
    }

    const getQueryPreview = (request: QueryRequest): string => {
        if (request.submissionType === SubmissionType.SCRIPT) {
            return request.scriptFileName || 'Script file';
        }
        const query = request.query || '';
        return query.length > 40 ? `${query.slice(0, 40)}...` : query;
    };

    const canClone = (request: QueryRequest): boolean => {
        return ['rejected', 'failed', 'withdrawn'].includes(request.status);
    };

    return (
        <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000] overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-black bg-[#FAF9F6]">
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Database
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Query/Script
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                    {requests.map((request, index) => (
                        <tr
                            key={request.id}
                            className="hover:bg-[#FEF34B]/20 transition-colors animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <td className="px-4 py-3 text-sm text-[#6B6B6B] font-mono">
                                {request.id.slice(0, 8)}
                            </td>
                            <td className="px-4 py-3">
                                <div className="text-sm font-semibold text-black">{request.instanceName}</div>
                                <div className="text-xs text-[#6B6B6B]">{request.databaseName}</div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    {request.databaseType === DatabaseType.MONGODB ? (
                                        <span className="text-xs px-2 py-0.5 bg-[#DCFCE7] text-[#166534] border border-[#22C55E] rounded font-semibold">
                                            Mongo
                                        </span>
                                    ) : (
                                        <span className="text-xs px-2 py-0.5 bg-[#DBEAFE] text-[#1E40AF] border border-[#3B82F6] rounded font-semibold">
                                            SQL
                                        </span>
                                    )}
                                    <span className="text-sm text-black font-mono truncate max-w-[200px]">
                                        {getQueryPreview(request)}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <StatusBadge status={request.status} />
                            </td>
                            <td className="px-4 py-3 text-sm text-[#6B6B6B]">
                                {formatDateShort(request.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onView(request)}
                                        className="p-2 text-black border-2 border-black rounded-md shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#FAF9F6] transition-all duration-150"
                                        title="View details"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                            />
                                        </svg>
                                    </button>
                                    {canClone(request) && (
                                        <button
                                            onClick={() => onClone(request)}
                                            className="p-2 text-black border-2 border-black rounded-md shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#FAF9F6] transition-all duration-150"
                                            title="Clone & resubmit"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
