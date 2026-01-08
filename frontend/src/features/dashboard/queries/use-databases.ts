import { useQuery } from '@tanstack/react-query';
import apiClient from '@queries/api-client';
import { queryKeys } from '@constants/query-keys';
import type { DatabaseInstance, Pod, ApiResponse } from '@/types';

// Get database instances (optionally filtered by type)
export function useInstances(type?: string) {
    return useQuery({
        queryKey: queryKeys.instances(type),
        queryFn: async () => {
            const params = type ? { type } : {};
            const response = await apiClient.get<ApiResponse<DatabaseInstance[]>>(
                '/databases/instances',
                { params }
            );
            return response.data.data || [];
        },
    });
}

// Get databases for a specific instance
export function useDatabases(instanceId: string) {
    return useQuery({
        queryKey: queryKeys.databases(instanceId),
        queryFn: async () => {
            const response = await apiClient.get<ApiResponse<string[]>>(
                `/databases/${instanceId}/databases`
            );
            return response.data.data || [];
        },
        enabled: !!instanceId,
    });
}

// Get all pods
export function usePods() {
    return useQuery({
        queryKey: queryKeys.pods,
        queryFn: async () => {
            const response = await apiClient.get<ApiResponse<Pod[]>>('/pods');
            return response.data.data || [];
        },
    });
}
