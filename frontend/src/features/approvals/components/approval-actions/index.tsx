import { useState } from 'react';
import { Button } from '@components/button';
import { Modal, ModalFooter } from '@components/modal';

interface ApprovalActionsProps {
    requestId: string;
    onApprove: (id: string) => void;
    onReject: (id: string, reason?: string) => void;
    isApproving: boolean;
    isRejecting: boolean;
    hasWarnings: boolean;
}

export function ApprovalActions({
    requestId,
    onApprove,
    onReject,
    isApproving,
    isRejecting,
    hasWarnings,
}: ApprovalActionsProps) {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const handleApprove = () => {
        if (hasWarnings) {
            setShowApproveConfirm(true);
        } else {
            onApprove(requestId);
        }
    };

    const handleConfirmApprove = () => {
        onApprove(requestId);
        setShowApproveConfirm(false);
    };

    const handleReject = () => {
        onReject(requestId, rejectReason || undefined);
        setShowRejectModal(false);
        setRejectReason('');
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApprove}
                    isLoading={isApproving}
                    disabled={isRejecting}
                >
                    Approve
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowRejectModal(true)}
                    isLoading={isRejecting}
                    disabled={isApproving}
                >
                    Reject
                </Button>
            </div>

            {/* Approve Confirmation (for requests with warnings) */}
            <Modal
                isOpen={showApproveConfirm}
                onClose={() => setShowApproveConfirm(false)}
                title="Confirm Approval"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-md shadow-[2px_2px_0_#000]">
                        <svg
                            className="w-6 h-6 text-[#92400E] flex-shrink-0"
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
                        <div>
                            <p className="text-sm font-bold text-[#92400E] uppercase">Warning</p>
                            <p className="text-sm text-[#92400E] mt-1">
                                This request has security warnings. Are you sure you want to approve it?
                            </p>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button variant="secondary" onClick={() => setShowApproveConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleConfirmApprove} isLoading={isApproving}>
                            Yes, Approve
                        </Button>
                    </ModalFooter>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                title="Reject Request"
                size="sm"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-black uppercase tracking-wide mb-2">
                            Rejection Reason (optional)
                        </label>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Provide a reason for rejection..."
                            className="w-full px-3 py-2.5 bg-white border-2 border-black rounded-md text-black placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#FEF34B] focus:ring-offset-1 resize-none h-24 hover:shadow-[2px_2px_0_#000] focus:shadow-[2px_2px_0_#000] transition-all duration-150"
                        />
                    </div>

                    <ModalFooter>
                        <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleReject} isLoading={isRejecting}>
                            Reject Request
                        </Button>
                    </ModalFooter>
                </div>
            </Modal>
        </>
    );
}
