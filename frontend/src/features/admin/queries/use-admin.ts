import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@queries/api-client';
import type { User, Pod, ApiResponse } from '@/types';

// Query keys
export const adminKeys = {
    all: ['admin'] as const,
    users: (search?: string, page?: number) => [...adminKeys.all, 'users', { search, page }] as const,
    user: (id: string) => [...adminKeys.all, 'users', id] as const,
    pods: () => [...adminKeys.all, 'pods'] as const,
};

// Types
export interface UsersResponse {
    success: boolean;
    requests: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateUserData {
    email: string;
    password: string;
    name: string;
    role: string;
    managedPodIds?: string[];
}

export interface UpdateUserData {
    name?: string;
    role?: string;
    managedPodIds?: string[];
    password?: string;
}

// Get all users with search and pagination
export function useUsers(search?: string, page: number = 1) {
    return useQuery({
        queryKey: adminKeys.users(search, page),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            params.set('page', page.toString());
            params.set('limit', '10');

            const { data } = await apiClient.get<UsersResponse>(`/admin/users?${params}`);
            return data;
        },
    });
}

// Get single user
export function useUser(id: string) {
    return useQuery({
        queryKey: adminKeys.user(id),
        queryFn: async () => {
            const { data } = await apiClient.get<ApiResponse<User>>(`/admin/users/${id}`);
            return data.data;
        },
        enabled: !!id,
    });
}

// Get all pods
export function usePods() {
    return useQuery({
        queryKey: adminKeys.pods(),
        queryFn: async () => {
            const { data } = await apiClient.get<ApiResponse<Pod[]>>('/admin/pods');
            return data.data || [];
        },
    });
}

// Create user
export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userData: CreateUserData) => {
            const { data } = await apiClient.post<ApiResponse<User>>('/admin/users', userData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

// Update user
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...userData }: UpdateUserData & { id: string }) => {
            const { data } = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, userData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}

// Delete user
export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.delete<ApiResponse<void>>(`/admin/users/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.all });
        },
    });
}
