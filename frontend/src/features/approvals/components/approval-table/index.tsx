import { useState } from 'react';
import type { QueryRequest } from '@/types';
import { DatabaseType, SubmissionType } from '@/types';
import { SkeletonTable } from '@components/skeleton';
import { NoPendingRequestsEmpty } from '@components/empty-state';
import { CodeViewer } from '@components/code-viewer';
import { WarningsDisplay } from '../warnings-display';
import { ApprovalActions } from '../approval-actions';
import { formatDate } from '@utils/format-date';
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
            <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000] overflow-hidden">
                <SkeletonTable rows={5} columns={7} />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000]">
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
        <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000] overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-black bg-[#FAF9F6]">
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider w-8">

                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Database
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Query/Script
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            POD
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Comments
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                    {requests.map((request, index) => (
                        <>
                            <tr
                                key={request.id}
                                className={cn(
                                    'hover:bg-[#FEF34B]/20 transition-colors cursor-pointer animate-fade-in',
                                    expandedId === request.id && 'bg-[#FEF34B]/10',
                                    request.warnings && request.warnings.length > 0 && 'border-l-4 border-l-[#F59E0B]'
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                            >
                                <td className="px-4 py-3 text-black">
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
                                    <div className="text-sm font-semibold text-black">{request.instanceName}</div>
                                    <div className="text-xs text-[#6B6B6B]">{request.databaseName}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-[#6B6B6B] font-mono">
                                    {request.id.slice(0, 8)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {request.warnings && request.warnings.length > 0 && (
                                            <span className="text-[#F59E0B]" title="Has security warnings">
                                                ⚠️
                                            </span>
                                        )}
                                        <span className="text-sm text-black font-mono truncate max-w-[180px]">
                                            {getQueryPreview(request)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-black">
                                    {request.userEmail}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#6B6B6B]">
                                    {request.podName}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#6B6B6B] max-w-[150px] truncate">
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
                                <tr className="bg-[#FAF9F6] border-t-2 border-black">
                                    <td colSpan={8} className="px-4 py-4">
                                        <div className="space-y-4">
                                            {/* Warnings */}
                                            {request.warnings && request.warnings.length > 0 && (
                                                <WarningsDisplay warnings={request.warnings} />
                                            )}

                                            {/* Query/Script Content */}
                                            <div>
                                                <p className="text-xs text-black font-bold uppercase tracking-wide mb-2">
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
                                                <p className="text-xs text-black font-bold uppercase tracking-wide mb-2">
                                                    Full Comments
                                                </p>
                                                <p className="text-sm text-black bg-white border-2 border-black p-3 rounded-md shadow-[2px_2px_0_#000]">
                                                    {request.comments}
                                                </p>
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex gap-6 text-sm">
                                                <div>
                                                    <span className="text-[#6B6B6B] font-semibold">Submitted:</span>{' '}
                                                    <span className="text-black">{formatDate(request.createdAt)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[#6B6B6B] font-semibold">Type:</span>{' '}
                                                    <span className="text-black">{request.databaseType}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[#6B6B6B] font-semibold">Submission:</span>{' '}
                                                    <span className="text-black">{request.submissionType}</span>
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
