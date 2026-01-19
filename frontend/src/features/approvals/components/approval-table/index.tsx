import { useState, Fragment } from 'react';
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
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-sm overflow-hidden">
                <SkeletonTable rows={5} columns={7} />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="bg-white border border-[#E2E8F0] rounded-md shadow-sm">
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
        <div className="bg-white border border-[#E2E8F0] rounded-md shadow-sm overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-[#E2E8F0] bg-[#F8FAFC]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r w-8">

                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r">
                            Database
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r">
                            ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r">
                            Query/Script
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r">
                            User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r">
                            POD
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r">
                            Comments
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#0F172A] r">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                    {requests.map((request, index) => (
                        <Fragment key={request.id}>
                            <tr
                                className={cn(
                                    'hover:bg-zinc-50 transition-colors cursor-pointer',
                                    expandedId === request.id && 'bg-zinc-100',
                                    request.warnings && request.warnings.length > 0 && 'border-l-4 border-l-[#F59E0B]'
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                            >
                                <td className="px-4 py-3 text-[#0F172A]">
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
                                    <div className="text-sm font-semibold text-[#0F172A]">{request.instanceName}</div>
                                    <div className="text-xs text-[#64748B]">{request.databaseName}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-[#64748B] font-mono">
                                    {request.id.slice(0, 8)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {request.warnings && request.warnings.length > 0 && (
                                            <span className="text-[#F59E0B]" title="Has security warnings">
                                                ⚠️
                                            </span>
                                        )}
                                        <span className="text-sm text-[#0F172A] font-mono truncate max-w-[180px]">
                                            {getQueryPreview(request)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-[#0F172A]">
                                    {request.userEmail}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#64748B]">
                                    {request.podName}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#64748B] max-w-[150px] truncate">
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
                                <tr className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0]">
                                    <td colSpan={8} className="px-4 py-4">
                                        <div className="space-y-4">
                                            {/* Warnings */}
                                            {request.warnings && request.warnings.length > 0 && (
                                                <WarningsDisplay warnings={request.warnings} />
                                            )}

                                            {/* Query/Script Content */}
                                            <div>
                                                <p className="text-xs text-[#0F172A] font-semibold  mb-2">
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
                                                <p className="text-xs text-[#0F172A] font-semibold  mb-2">
                                                    Full Comments
                                                </p>
                                                <p className="text-sm text-[#0F172A] bg-white border border-[#E2E8F0] p-3 rounded-md ">
                                                    {request.comments}
                                                </p>
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex gap-6 text-sm">
                                                <div>
                                                    <span className="text-[#64748B] font-semibold">Submitted:</span>{' '}
                                                    <span className="text-[#0F172A]">{formatDate(request.createdAt)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[#64748B] font-semibold">Type:</span>{' '}
                                                    <span className="text-[#0F172A]">{request.databaseType}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[#64748B] font-semibold">Submission:</span>{' '}
                                                    <span className="text-[#0F172A]">{request.submissionType}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
