import { useState } from 'react';
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
    const [isDownloading, setIsDownloading] = useState(false);

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
                        <p className="text-xs text-[#64748B] font-mono">ID: {request.id}</p>
                        <p className="text-sm text-[#64748B] mt-1">
                            Submitted on {formatDate(request.createdAt)}
                        </p>
                    </div>
                    <StatusBadge status={request.status} />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md ">
                    <div>
                        <p className="text-xs text-[#0F172A] font-semibold ">Database Type</p>
                        <p className="text-sm text-[#0F172A] mt-1">{request.databaseType}</p>
                    </div>
                    <div>
                        <p className="text-xs text-[#0F172A] font-semibold ">Instance</p>
                        <p className="text-sm text-[#0F172A] mt-1">{request.instanceName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-[#0F172A] font-semibold ">Database</p>
                        <p className="text-sm text-[#0F172A] mt-1">{request.databaseName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-[#0F172A] font-semibold ">POD</p>
                        <p className="text-sm text-[#0F172A] mt-1">{request.podName}</p>
                    </div>
                </div>

                {/* Warnings */}
                {request.warnings && request.warnings.length > 0 && (
                    <div className="p-4 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-md ">
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
                            <span className="text-sm font-semibold text-[#92400E] uppercase">Security Warnings</span>
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
                        language={getLanguage()}
                        maxHeight="200px"
                    />
                </div>

                {/* Comments */}
                <div>
                    <p className="text-xs text-[#0F172A] font-semibold  mb-2">Comments</p>
                    <p className="text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-md ">
                        {request.comments}
                    </p>
                </div>

                {/* Execution Result */}
                {request.executionResult && (
                    <div>
                        <p className="text-xs text-[#0F172A] font-semibold  mb-2">Execution Result</p>
                        {request.isCompressed ? (
                            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md ">
                                <p className="text-sm text-[#64748B] mb-3">
                                    Result is large and stored compressed. Click to download.
                                </p>
                                <button
                                    onClick={async () => {
                                        try {
                                            setIsDownloading(true);
                                            // Get token from Zustand persisted storage
                                            const authStorage = localStorage.getItem('auth-storage');
                                            let token = null;
                                            if (authStorage) {
                                                const parsed = JSON.parse(authStorage);
                                                token = parsed?.state?.token;
                                            }
                                            if (!token) {
                                                alert('Please log in again to download the result.');
                                                return;
                                            }
                                            const response = await fetch(
                                                `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/requests/${request.id}/download-result`,
                                                {
                                                    headers: {
                                                        Authorization: `Bearer ${token}`,
                                                    },
                                                }
                                            );
                                            if (!response.ok) {
                                                throw new Error('Download failed');
                                            }
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `result_${request.id}.json`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);
                                        } catch (error) {
                                            console.error('Download error:', error);
                                            alert('Failed to download result. Please try again.');
                                        } finally {
                                            setIsDownloading(false);
                                        }
                                    }}
                                    disabled={isDownloading}
                                    className={`inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white font-semibold text-sm rounded-md transition-colors shadow-sm ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1D4ED8]'
                                        }`}
                                >
                                    {isDownloading ? (
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    )}
                                    {isDownloading ? 'Downloading...' : 'Download Result'}
                                </button>
                            </div>
                        ) : (
                            <CodeViewer
                                code={request.executionResult}
                                language="json"
                                maxHeight="200px"
                            />
                        )}
                    </div>
                )}

                {/* Execution Error */}
                {request.executionError && (
                    <div className="p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-md ">
                        <p className="text-xs text-[#0F172A] font-semibold  mb-2">Execution Error</p>
                        <pre className="text-sm text-[#991B1B] font-mono whitespace-pre-wrap">
                            {request.executionError}
                        </pre>
                    </div>
                )}

                {/* Rejection Reason */}
                {request.rejectionReason && (
                    <div className="p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-md ">
                        <p className="text-xs text-[#0F172A] font-semibold  mb-2">Rejection Reason</p>
                        <p className="text-sm text-[#991B1B]">{request.rejectionReason}</p>
                    </div>
                )}

                {/* Approver Info */}
                {request.approverEmail && (
                    <div>
                        <p className="text-xs text-[#0F172A] font-semibold  mb-1">
                            {request.status === 'rejected' ? 'Rejected by' : 'Approved by'}
                        </p>
                        <p className="text-sm text-[#0F172A]">{request.approverEmail}</p>
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
