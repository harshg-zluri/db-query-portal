import { Modal, ModalFooter } from '@components/modal';
import { Button } from '@components/button';
import { StatusBadge } from '@components/status-badge';
import { CodeViewer } from '@components/code-viewer';
import type { QueryRequest } from '@/types';
import { SubmissionType, DatabaseType } from '@/types';
import { formatDate } from '@utils/format-date';

interface SubmissionDetailModalProps {
    request: QueryRequest | null;
    isOpen: boolean;
    onClose: () => void;
    onWithdraw?: (id: string) => void;
    isWithdrawing?: boolean;
}

export function SubmissionDetailModal({
    request,
    isOpen,
    onClose,
    onWithdraw,
    isWithdrawing,
}: SubmissionDetailModalProps) {
    if (!request) return null;

    const canWithdraw = request.status === 'pending';

    const getLanguage = (): 'sql' | 'javascript' | 'mongodb' => {
        if (request.submissionType === SubmissionType.SCRIPT) return 'javascript';
        return request.databaseType === DatabaseType.MONGODB ? 'mongodb' : 'sql';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Request Details" size="lg">
            <div className="space-y-6">
                {/* Header Info */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-[#6B6B6B] font-mono">ID: {request.id}</p>
                        <p className="text-sm text-[#6B6B6B] mt-1">
                            Submitted on {formatDate(request.createdAt)}
                        </p>
                    </div>
                    <StatusBadge status={request.status} />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-[#FAF9F6] border-2 border-black rounded-md shadow-[2px_2px_0_#000]">
                    <div>
                        <p className="text-xs text-black font-bold uppercase tracking-wide">Database Type</p>
                        <p className="text-sm text-black mt-1">{request.databaseType}</p>
                    </div>
                    <div>
                        <p className="text-xs text-black font-bold uppercase tracking-wide">Instance</p>
                        <p className="text-sm text-black mt-1">{request.instanceName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-black font-bold uppercase tracking-wide">Database</p>
                        <p className="text-sm text-black mt-1">{request.databaseName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-black font-bold uppercase tracking-wide">POD</p>
                        <p className="text-sm text-black mt-1">{request.podName}</p>
                    </div>
                </div>

                {/* Warnings */}
                {request.warnings && request.warnings.length > 0 && (
                    <div className="p-4 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-md shadow-[2px_2px_0_#000]">
                        <div className="flex items-center gap-2 mb-2">
                            <svg
                                className="w-5 h-5 text-[#92400E]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <span className="text-sm font-bold text-[#92400E] uppercase">Security Warnings</span>
                        </div>
                        <ul className="space-y-1 list-none">
                            {request.warnings.map((warning, index) => (
                                <li key={index} className="text-sm text-[#92400E]">
                                    {warning}
                                </li>
                            ))}
                        </ul>
                    </div>
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
                        language={getLanguage()}
                        maxHeight="200px"
                    />
                </div>

                {/* Comments */}
                <div>
                    <p className="text-xs text-black font-bold uppercase tracking-wide mb-2">Comments</p>
                    <p className="text-sm text-black bg-[#FAF9F6] border-2 border-black p-3 rounded-md shadow-[2px_2px_0_#000]">
                        {request.comments}
                    </p>
                </div>

                {/* Execution Result */}
                {request.executionResult && (
                    <div>
                        <p className="text-xs text-black font-bold uppercase tracking-wide mb-2">Execution Result</p>
                        <CodeViewer
                            code={request.executionResult}
                            language="json"
                            maxHeight="200px"
                        />
                    </div>
                )}

                {/* Execution Error */}
                {request.executionError && (
                    <div className="p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-md shadow-[2px_2px_0_#000]">
                        <p className="text-xs text-black font-bold uppercase tracking-wide mb-2">Execution Error</p>
                        <pre className="text-sm text-[#991B1B] font-mono whitespace-pre-wrap">
                            {request.executionError}
                        </pre>
                    </div>
                )}

                {/* Rejection Reason */}
                {request.rejectionReason && (
                    <div className="p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-md shadow-[2px_2px_0_#000]">
                        <p className="text-xs text-black font-bold uppercase tracking-wide mb-2">Rejection Reason</p>
                        <p className="text-sm text-[#991B1B]">{request.rejectionReason}</p>
                    </div>
                )}

                {/* Approver Info */}
                {request.approverEmail && (
                    <div>
                        <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">
                            {request.status === 'rejected' ? 'Rejected by' : 'Approved by'}
                        </p>
                        <p className="text-sm text-black">{request.approverEmail}</p>
                    </div>
                )}
            </div>

            <ModalFooter>
                {canWithdraw && onWithdraw && (
                    <Button
                        variant="danger"
                        onClick={() => onWithdraw(request.id)}
                        isLoading={isWithdrawing}
                    >
                        Withdraw Request
                    </Button>
                )}
                <Button variant="secondary" onClick={onClose}>
                    Close
                </Button>
            </ModalFooter>
        </Modal>
    );
}
