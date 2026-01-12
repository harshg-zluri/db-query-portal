import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@stores/auth-store';
import { ROUTES } from '@constants/routes';
import toast from 'react-hot-toast';
import type { SafeUser } from '@/types';
import { apiClient } from '@queries/api-client';

export function OAuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (accessToken && refreshToken) {
            // Fetch user profile to get full user object
            // We can do this via an API call since we have the token
            // Or change backend to send user object in URL (less secure/too large)

            // For now, let's assume we need to fetch 'me'

            // Manually set token for this request since store update might not be instant/reflected in interceptor yet?
            // Actually store update is synchronous.

            login(accessToken, refreshToken, {} as any); // Temporary user object until we fetch

            apiClient.get('/auth/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            }).then(response => {
                const user = response.data.data as SafeUser;
                // Update store with user
                login(accessToken, refreshToken, user);
                toast.success('Login successful!');
                navigate(ROUTES.DASHBOARD, { replace: true });
            }).catch(err => {
                console.error('Failed to fetch profile', err);
                toast.error('Authentication failed');
                navigate(ROUTES.LOGIN, { replace: true });
            });

        } else {
            toast.error('Authentication failed');
            navigate(ROUTES.LOGIN, { replace: true });
        }
    }, [searchParams, login, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F3F0E6]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-bold">Authenticating...</h2>
            </div>
        </div>
    );
}
