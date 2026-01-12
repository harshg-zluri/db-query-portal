import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@stores/auth-store';
import { ROUTES } from '@constants/routes';
import { Button } from '@components/button';
import apiClient from '@queries/api-client';
import toast from 'react-hot-toast';
import Logo from '@assets/logo.svg';

export function Navbar() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleLogout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            // Ignore logout errors
        } finally {
            // Clear React Query cache to prevent stale data from previous user
            queryClient.clear();
            logout();
            toast.success('Logged out successfully');
            navigate(ROUTES.LOGIN);
        }
    };

    return (
        <header className="h-16 bg-white border-b-2 border-black flex items-center justify-between px-6">
            <div className="flex items-center gap-3 justify-center">
                <img src={Logo} alt="Zluri" className="h-8" />
                <h2 className="text-lg font-bold text-black uppercase tracking-wide pt-3">
                    Database Query Portal
                </h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-semibold text-black">{user?.name}</p>
                    <p className="text-xs text-[#6B6B6B] uppercase tracking-wide">{user?.role}</p>
                </div>

                <Button variant="secondary" size="sm" onClick={handleLogout}>
                    <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    Logout
                </Button>
            </div>
        </header>
    );
}
