import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from '@components/select';
import { Button } from '@components/button';
import { SubmissionTable } from './components/submission-table';
import { SubmissionDetailModal } from './components/submission-detail-modal';
import { useMySubmissions, useWithdrawRequest } from './queries/use-submissions';
import type { QueryRequest } from '@/types';
import { RequestStatus } from '@/types';
import { ROUTES } from '@constants/routes';
import toast from 'react-hot-toast';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: RequestStatus.PENDING, label: 'Pending' },
    { value: RequestStatus.APPROVED, label: 'Approved' },
    { value: RequestStatus.EXECUTED, label: 'Executed' },
    { value: RequestStatus.REJECTED, label: 'Rejected' },
    { value: RequestStatus.FAILED, label: 'Failed' },
    { value: RequestStatus.WITHDRAWN, label: 'Withdrawn' },
];

export function SubmissionsPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
    const [selectedRequest, setSelectedRequest] = useState<QueryRequest | null>(null);

    const { data, isLoading } = useMySubmissions(
        page,
        statusFilter || undefined
    );
    const withdrawMutation = useWithdrawRequest();

    const requests = data?.requests || [];
    const pagination = data?.pagination;

    const handleView = (request: QueryRequest) => {
        setSelectedRequest(request);
    };

    const handleClone = (request: QueryRequest) => {
        navigate(ROUTES.DASHBOARD, { state: { clone: request } });
    };

    const handleWithdraw = async (id: string) => {
        try {
            await withdrawMutation.mutateAsync(id);
            toast.success('Request withdrawn successfully');
            setSelectedRequest(null);
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                'Failed to withdraw request';
            toast.error(message);
        }
    };

    const handleCreateNew = () => {
        navigate(ROUTES.DASHBOARD);
    };

    const handleClearFilters = () => {
        setStatusFilter('');
        setPage(1);
    };

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[#0F172A]">My Submissions</h1>
                    <p className="text-[#64748B] mt-1">
                        Track and manage your query requests
                    </p>
                </div>
                <Button onClick={handleCreateNew}>
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
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    New Request
                </Button>
            </div>

            {/* Filters */}
            <div className="mb-4 flex items-center gap-4">
                <div className="w-48">
                    <Select
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value as RequestStatus | '');
                            setPage(1);
                        }}
                        placeholder="Filter by status"
                    />
                </div>

                {pagination && (
                    <p className="text-sm text-[#64748B]">
                        Showing {requests.length} of {pagination.total} submissions
                    </p>
                )}
            </div>

            {/* Table */}
            <SubmissionTable
                requests={requests}
                isLoading={isLoading}
                onView={handleView}
                onClone={handleClone}
                onCreateNew={handleCreateNew}
                isEmpty={requests.length === 0}
                hasFilters={!!statusFilter}
                onClearFilters={handleClearFilters}
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

                    <span className="text-sm text-[#0F172A] font-medium px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg">
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

            {/* Detail Modal */}
            <SubmissionDetailModal
                request={selectedRequest}
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                onWithdraw={handleWithdraw}
                isWithdrawing={withdrawMutation.isPending}
            />
        </div>
    );
}

export default SubmissionsPage;
