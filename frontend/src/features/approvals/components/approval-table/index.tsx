import { useState } from 'react';
import type { QueryRequest } from '@/types';
import { DatabaseType, SubmissionType } from '@/types';
import { SkeletonTable } from '@components/skeleton';
import { NoPendingRequestsEmpty } from '@components/empty-state';
import { CodeViewer } from '@components/code-viewer';
import { WarningsDisplay } from '../warnings-display';
import { ApprovalActions } from '../approval-actions';
import { formatDateShort } from '@utils/format-date';
import { cn } from '@utils/cn';

interface ApprovalTableProps {
    requests: QueryRequest[];
    isLoading: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string, reason?: string) => void;
    approvingId: string | null;
    rejectingId: string | null;
}

export function ApprovalTable({
    requests,
    isLoading,
    onApprove,
    onReject,
    approvingId,
    rejectingId,
}: ApprovalTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (isLoading) {
        return (
            <div className="bg-[#111113] border border-[#27272a] rounded-lg overflow-hidden">
                <SkeletonTable rows={5} columns={7} />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="bg-[#111113] border border-[#27272a] rounded-lg">
                <NoPendingRequestsEmpty />
            </div>
        );
    }

    const getQueryPreview = (request: QueryRequest): string => {
        if (request.submissionType === SubmissionType.SCRIPT) {
            return request.scriptFileName || 'Script file';
        }
        const query = request.query || '';
        return query.length > 50 ? `${query.slice(0, 50)}...` : query;
    };

    const getLanguage = (request: QueryRequest): 'sql' | 'javascript' | 'mongodb' => {
        if (request.submissionType === SubmissionType.SCRIPT) return 'javascript';
        return request.databaseType === DatabaseType.MONGODB ? 'mongodb' : 'sql';
    };

    return (
        <div className="bg-[#111113] border border-[#27272a] rounded-lg overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-[#27272a] bg-[#0a0a0b]">
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-8">

                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            Database
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            Query/Script
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            POD
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            Comments
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                    {requests.map((request) => (
                        <>
                            <tr
                                key={request.id}
                                className={cn(
                                    'hover:bg-[#1a1a1d]/50 transition-colors cursor-pointer',
                                    expandedId === request.id && 'bg-[#1a1a1d]/50',
                                    request.warnings && request.warnings.length > 0 && 'border-l-2 border-l-amber-500'
                                )}
                                onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                            >
                                <td className="px-4 py-3 text-zinc-400">
                                    <svg
                                        className={cn(
                                            'w-4 h-4 transition-transform',
                                            expandedId === request.id && 'rotate-90'
                                        )}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-sm text-zinc-100">{request.instanceName}</div>
                                    <div className="text-xs text-zinc-500">{request.databaseName}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-400 font-mono">
                                    {request.id.slice(0, 8)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {request.warnings && request.warnings.length > 0 && (
                                            <span className="text-amber-500" title="Has security warnings">
                                                ⚠️
                                            </span>
                                        )}
                                        <span className="text-sm text-zinc-300 font-mono truncate max-w-[180px]">
                                            {getQueryPreview(request)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-300">
                                    {request.userEmail}
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-400">
                                    {request.podName}
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-400 max-w-[150px] truncate">
                                    {request.comments}
                                </td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <ApprovalActions
                                        requestId={request.id}
                                        onApprove={onApprove}
                                        onReject={onReject}
                                        isApproving={approvingId === request.id}
                                        isRejecting={rejectingId === request.id}
                                        hasWarnings={(request.warnings?.length || 0) > 0}
                                    />
                                </td>
                            </tr>

                            {/* Expanded Row */}
                            {expandedId === request.id && (
                                <tr className="bg-[#0a0a0b]">
                                    <td colSpan={8} className="px-4 py-4">
                                        <div className="space-y-4">
                                            {/* Warnings */}
                                            {request.warnings && request.warnings.length > 0 && (
                                                <WarningsDisplay warnings={request.warnings} />
                                            )}

                                            {/* Query/Script Content */}
                                            <div>
                                                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                                                    {request.submissionType === SubmissionType.SCRIPT
                                                        ? `Script: ${request.scriptFileName}`
                                                        : 'Query'}
                                                </p>
                                                <CodeViewer
                                                    code={
                                                        request.submissionType === SubmissionType.SCRIPT
                                                            ? request.scriptContent || 'Script content not available'
                                                            : request.query || 'Query not available'
                                                    }
                                                    language={getLanguage(request)}
                                                    maxHeight="200px"
                                                />
                                            </div>

                                            {/* Full Comments */}
                                            <div>
                                                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                                                    Full Comments
                                                </p>
                                                <p className="text-sm text-zinc-300 bg-[#111113] p-3 rounded-lg">
                                                    {request.comments}
                                                </p>
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex gap-6 text-sm">
                                                <div>
                                                    <span className="text-zinc-500">Submitted:</span>{' '}
                                                    <span className="text-zinc-300">{formatDateShort(request.createdAt)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500">Type:</span>{' '}
                                                    <span className="text-zinc-300">{request.databaseType}</span>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500">Submission:</span>{' '}
                                                    <span className="text-zinc-300">{request.submissionType}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
