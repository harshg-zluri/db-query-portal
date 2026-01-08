import { useMutation } from '@tanstack/react-query';
import apiClient from '@queries/api-client';
import type { LoginRequest, LoginResponse, ApiResponse } from '@/types';

export function useLogin() {
    return useMutation({
        mutationFn: async (credentials: LoginRequest) => {
            const response = await apiClient.post<ApiResponse<LoginResponse>>(
                '/auth/login',
                credentials
            );
            return response.data.data!;
        },
    });
}
