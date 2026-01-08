import { useState } from 'react';
import { Button } from '@components/button';
import { ApprovalTable } from './components/approval-table';
import { usePendingRequests, useApproveRequest, useRejectRequest } from './queries/use-approvals';
import toast from 'react-hot-toast';

export function ApprovalsPage() {
    const [page, setPage] = useState(1);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    const { data, isLoading, refetch } = usePendingRequests(page);
    const approveMutation = useApproveRequest();
    const rejectMutation = useRejectRequest();

    const requests = data?.requests || [];
    const pagination = data?.pagination;

    const handleApprove = async (id: string) => {
        setApprovingId(id);
        try {
            await approveMutation.mutateAsync(id);
            toast.success('Request approved and executed successfully');
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to approve request';
            toast.error(message);
        } finally {
            setApprovingId(null);
        }
    };

    const handleReject = async (id: string, reason?: string) => {
        setRejectingId(id);
        try {
            await rejectMutation.mutateAsync({ id, reason });
            toast.success('Request rejected');
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to reject request';
            toast.error(message);
        } finally {
            setRejectingId(null);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Approval Dashboard</h1>
                    <p className="text-zinc-400 mt-1">
                        Review and approve pending query requests
                    </p>
                </div>
                <Button variant="secondary" onClick={() => refetch()}>
                    <svg
                        className="w-4 h-4 mr-2"
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
                    Refresh
                </Button>
            </div>

            {/* Summary */}
            {pagination && (
                <div className="mb-4 p-4 bg-[#111113] border border-[#27272a] rounded-lg flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                            <svg
                                className="w-5 h-5 text-amber-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100">{pagination.total}</p>
                            <p className="text-xs text-zinc-500">Pending Requests</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <ApprovalTable
                requests={requests}
                isLoading={isLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                approvingId={approvingId}
                rejectingId={rejectingId}
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>

                    <span className="text-sm text-zinc-400 px-4">
                        Page {page} of {pagination.totalPages}
                    </span>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}

export default ApprovalsPage;
