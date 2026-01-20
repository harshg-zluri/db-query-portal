import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@stores/auth-store';
import type { ApiResponse, RefreshTokenResponse } from '@/types';

// Get API base URL from environment variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// State for token refresh
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
}> = [];

// Process queued requests after token refresh
const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Extend config type to include retry flag
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Request interceptor to attach token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            const authStore = useAuthStore.getState();

            // Check if we have a refresh token
            // If we're unauthorized, try to refresh
            // We don't check for failure here anymore because refreshToken is in cookie

            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            // Mark that we're refreshing
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
                    `${API_BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const { accessToken } = response.data.data!;

                // Update tokens in store
                authStore.setTokens(accessToken);

                // Process queued requests with new token
                processQueue(null, accessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed, process queue with error and logout
                processQueue(refreshError as Error, null);
                authStore.logout();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;

