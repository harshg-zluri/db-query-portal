import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@queries/api-client';
import { queryKeys } from '@constants/query-keys';
import type { QueryRequest, ApiResponse, PaginatedResponse, RequestStatus } from '@/types';

// Get my submissions with pagination
export function useMySubmissions(page: number = 1, status?: RequestStatus) {
    return useQuery({
        queryKey: queryKeys.myRequests(page, status),
        queryFn: async () => {
            const params: Record<string, unknown> = { page, limit: 10 };
            if (status) params.status = status;

            const response = await apiClient.get<PaginatedResponse<QueryRequest>>(
                '/requests/my',
                { params }
            );

            return {
                requests: response.data.data || [],
                pagination: response.data.pagination,
            };
        },
    });
}

// Get single request by ID
export function useRequest(id: string) {
    return useQuery({
        queryKey: queryKeys.request(id),
        queryFn: async () => {
            const response = await apiClient.get<ApiResponse<QueryRequest>>(
                `/requests/${id}`
            );
            return response.data.data!;
        },
        enabled: !!id,
    });
}

// Withdraw a pending request
export function useWithdrawRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.post<ApiResponse<QueryRequest>>(
                `/requests/${id}/withdraw`
            );
            return response.data.data!;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-requests'] });
        },
    });
}
