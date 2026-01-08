import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@queries/api-client';
import { queryKeys } from '@constants/query-keys';
import type { QueryRequest, ApiResponse, PaginatedResponse } from '@/types';

// Get pending requests for approval (manager only)
export function usePendingRequests(page: number = 1) {
    return useQuery({
        queryKey: queryKeys.pendingRequests(page),
        queryFn: async () => {
            const response = await apiClient.get<PaginatedResponse<QueryRequest>>(
                '/requests/pending',
                { params: { page, limit: 10 } }
            );

            return {
                requests: response.data.data || [],
                pagination: response.data.pagination,
            };
        },
    });
}

// Approve a request
export function useApproveRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.post<ApiResponse<QueryRequest>>(
                `/requests/${id}/approve`
            );
            return response.data.data!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
            queryClient.invalidateQueries({ queryKey: ['my-requests'] });
        },
    });
}

// Reject a request
export function useRejectRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
            const response = await apiClient.post<ApiResponse<QueryRequest>>(
                `/requests/${id}/reject`,
                { reason }
            );
            return response.data.data!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
            queryClient.invalidateQueries({ queryKey: ['my-requests'] });
        },
    });
}
